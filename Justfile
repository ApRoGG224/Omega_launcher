# Omega Launcher — Justfile
# Требуется just: https://github.com/casey/just (brew install just / apt install just)

set shell := ["bash", "-c"]

# Применить неприменённые миграции Supabase (требует SUPABASE_ACCESS_TOKEN в .env)
migration:
    node scripts/migrations.mjs

# Показать статус миграций
migration-status:
    node scripts/migrations.mjs status

# Создать новый файл миграции: just migration-new <имя>
migration-new name:
    node scripts/migrations.mjs new {{name}}

# Пометить все текущие миграции как применённые (если схема уже внесена вручную)
migration-import:
    node scripts/migrations.mjs import

# Миграции + полная сборка проекта (фронтенд + Rust)
build:
    @just migration || true
    npm run build
    npm test
    cargo check --manifest-path src-tauri/Cargo.toml

# Собрать фронтенд без миграций (быстрая проверка)
build-frontend:
    npm run build

# Поднять patch-версию и закоммитить: just version [major|minor|patch]
version PART='patch':
    @node scripts/bump-version.mjs {{PART}}
    git add -A
    git commit -m "chore: bump version to $(node -e \"console.log(JSON.parse(require('fs').readFileSync('package.json')).version)\")"

# Релиз: бамп версии, коммит, пуш + тег (GitHub Actions соберёт и выложит релиз)
release PART='patch':
    @just version {{PART}}
    git push origin HEAD
    git tag v$(node -e "console.log(JSON.parse(require('fs').readFileSync('package.json')).version)")
    git push origin --tags
