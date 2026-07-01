# club-erp
University club management platform with RBAC, attendance, and financial tracking

## Tech Stack
- Frontend: React 18, Vite, Tailwind CSS, Zustand, React Router v6
- Backend: Supabase (PostgreSQL, Auth, Storage, Edge Functions, RLS)
- Deploy: Vercel (Frontend), GitHub Actions (CI/CD)
- Editor: Tiptap (공지 에디터)
- Calendar: FullCalendar

## Documentation
- ERD: [ERDCloud](https://www.erdcloud.com/d/faZvhySPaSoXtv24j)
- API: 추후 Swagger 링크 추가 예정

## Getting Started
(추후 작성)

## Commit Convention

| Type | Description |
|---|---|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `design` | UI 변경 (기능 변경 없음) |
| `refactor` | 코드 리팩토링 |
| `chore` | 빌드, 설정 파일 수정 |
| `docs` | 문서 수정 |
| `test` | 테스트 코드 |

### Format
type: 작업 내용

### Example
- feat: 회원 등록 기능 구현
- fix: 출석 상태 저장 오류 수정
- design: 대시보드 레이아웃 수정
- refactor: 회원 서비스 계층 분리
- chore: GitHub Actions 설정 추가
- docs: README 커밋 컨벤션 추가

## Database Schema (ERD)

```mermaid
erDiagram
    auth_users ||--o| members : "1:1 (user_id)"
    roles ||--o{ members : "1:N (role_id)"
    members ||--o{ activity_attendances : "1:N"
    activities ||--o{ activity_attendances : "1:N"
    auth_users ||--o{ activities : "1:N (created_by)"
    auth_users ||--o{ notices : "1:N (author_id)"
    notices ||--o{ notice_files : "1:N"
    notices ||--o{ events : "1:N (notice_id)"
    auth_users ||--o{ events : "1:N (created_by)"
    auth_users ||--o{ finance : "1:N (created_by)"
    finance ||--o{ finance_files : "1:N"

    app_settings {
        text key PK
        text value
    }
    roles {
        uuid id PK
        text name "UNIQUE"
        boolean is_president "UNIQUE if true"
        boolean perm_members
        boolean perm_activities
        boolean perm_notices
        boolean perm_calendar
        boolean perm_finance
    }
    members {
        uuid id PK
        uuid user_id FK
        uuid role_id FK
        text name
        text student_id "UNIQUE"
        text email "UNIQUE"
        text phone
        text department
        text college
        text join_semester
        text join_type
        integer grade
        boolean paid
    }
    activities {
        uuid id PK
        text title
        date date
        uuid created_by FK
    }
    activity_attendances {
        uuid id PK
        uuid activity_id FK
        uuid member_id FK
        boolean attended
        text note
    }
    notices {
        uuid id PK
        text title
        text content
        uuid author_id FK
        timestamptz created_at
        timestamptz updated_at
    }
    notice_files {
        uuid id PK
        uuid notice_id FK
        text file_name
        text file_path
        integer file_size
    }
    events {
        uuid id PK
        text title
        date start_date
        date end_date
        text content
        uuid notice_id FK
        uuid created_by FK
    }
    finance {
        uuid id PK
        date date
        text type "수입, 지출"
        text item
        integer amount "> 0"
        text note
        text semester "regex ^[0-9]{2}-[12]$"
        uuid created_by FK
    }
    finance_files {
        uuid id PK
        uuid finance_id FK
        text file_name
        text file_path
    }
```
