import os
from urllib.parse import quote_plus

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import create_engine, Column, Integer, String
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy.orm import declarative_base
from typing import List
from pydantic import BaseModel
from fastapi import Path

app = FastAPI()


def _parse_origins() -> list[str]:
    raw = os.getenv("BACKEND_CORS_ORIGINS", "")
    if raw.strip():
        return [o.strip() for o in raw.split(",") if o.strip()]
    return [
        "http://localhost",
        "http://localhost:4200",
        "capacitor://localhost",
    ]


origins = _parse_origins()

# Agregar el middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# Configuración de la base de datos (env on EC2/Docker; localhost fallback for local dev)
def _database_url() -> str:
    explicit = os.getenv("DATABASE_URL")
    if explicit:
        return explicit
    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASSWORD", "admin")
    host = os.getenv("POSTGRES_SERVER", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    db = os.getenv("POSTGRES_DB", "java_test2")
    return (
        f"postgresql://{quote_plus(user)}:{quote_plus(password)}"
        f"@{host}:{port}/{db}"
    )


SQLALCHEMY_DATABASE_URL = _database_url()

# Configuración de seguridad para la generación de tokens JWT
SECRET_KEY = os.getenv("SECRET_KEY", "tu_clave_secreta")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Configuración de seguridad para el hashing de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Inicialización del ORM
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class UserResponse(BaseModel):
    id: int
    username: str
    email: str

# Conexión a la base de datos
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

# Funciones para trabajar con la base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Función para verificar y obtener el usuario actual desde el token JWT
def get_current_user(token: str = Depends(OAuth2PasswordBearer(tokenUrl="/login")), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    user = get_user_by_username(db, username)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return user

def get_user_by_username(db, username: str):
    return db.query(User).filter(User.username == username).first()

# Funciones para la autenticación
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Rutas del API
@app.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(user: dict, db: Session = Depends(get_db)):
    db_user = get_user_by_username(db, user['username'])
    if db_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El usuario ya existe")
    hashed_password = pwd_context.hash(user['password'])
    db_user = User(username=user['username'], email=user['email'], hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    return {"message": "Usuario registrado exitosamente"}

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = get_user_by_username(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")
    access_token = create_access_token({"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.put("/change-password")
def change_password(new_password: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    hashed_password = pwd_context.hash(new_password)
    current_user.hashed_password = hashed_password
    db.commit()
    return {"message": "Contraseña actualizada exitosamente"}

@app.get("/users/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@app.get("/users", response_model=List[UserResponse])
def read_users(db: Session = Depends(get_db)) -> List[UserResponse]:
    users = db.query(User).all()
    return [UserResponse(id=user.id, username=user.username, email=user.email) for user in users]


@app.get("/users/{user_id}", response_model=UserResponse)
def read_user_by_id(
    user_id: int = Path(..., title="The ID of the user to retrieve"),
    db: Session = Depends(get_db),
) -> UserResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )
    return UserResponse(id=user.id, username=user.username, email=user.email)


@app.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int = Path(..., title="The ID of the user to delete"),
    db: Session = Depends(get_db),
) -> None:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )
    db.delete(user)
    db.commit()