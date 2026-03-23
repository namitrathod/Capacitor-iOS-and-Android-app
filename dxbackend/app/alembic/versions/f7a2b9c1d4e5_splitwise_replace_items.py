"""Splitwise-style groups/expenses; drop legacy item table."""

import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from alembic import op

revision = "f7a2b9c1d4e5"
down_revision = "e2412789c190"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(sa.text("DROP TABLE IF EXISTS sale"))
    op.execute(sa.text("DROP TABLE IF EXISTS item"))

    op.create_table(
        "split_group",
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_split_group_name"), "split_group", ["name"], unique=False)

    op.create_table(
        "group_member",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["split_group.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_group_member_group_id"), "group_member", ["group_id"])
    op.create_index(op.f("ix_group_member_user_id"), "group_member", ["user_id"])

    op.create_table(
        "expense",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("paid_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["split_group.id"]),
        sa.ForeignKeyConstraint(["paid_by_user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_expense_group_id"), "expense", ["group_id"])

    op.create_table(
        "expenseshare",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("expense_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["expense_id"], ["expense.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_expenseshare_expense_id"), "expenseshare", ["expense_id"]
    )


def downgrade():
    op.drop_table("expenseshare")
    op.drop_table("expense")
    op.drop_index(op.f("ix_group_member_user_id"), table_name="group_member")
    op.drop_index(op.f("ix_group_member_group_id"), table_name="group_member")
    op.drop_table("group_member")
    op.drop_index(op.f("ix_split_group_name"), table_name="split_group")
    op.drop_table("split_group")

    op.create_table(
        "item",
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["owner_id"],
            ["user.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
