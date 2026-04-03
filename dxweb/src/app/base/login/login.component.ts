import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../service/auth-service.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username: string;
  password: string;
  errorMessage: string;

  constructor(public authService: AuthService, private router: Router) {
    this.username = '';
    this.password = '';
    this.errorMessage = '';
   }

   login() {
    this.authService.login(this.username, this.password).subscribe(
      () => {
        this.router.navigate(['/groups']);
      },
      (error) => {
        if (error.status === 0) {
          // No HTTP response: offline, DNS, TLS, firewall, or CORS blocking (browser hides the real status).
          this.errorMessage =
            'Error de conexión: No se pudo conectar al servidor. Comprueba Internet, que https://app.scriptchain.co/docs abre en el navegador, y que el backend en EC2 está en marcha (DNS/IP).';
        } else {
          const d = error?.error?.detail;
          this.errorMessage =
            typeof d === 'string' ? d : d != null ? String(d) : 'Error del servidor';
        }
      }
    );
  }
}

