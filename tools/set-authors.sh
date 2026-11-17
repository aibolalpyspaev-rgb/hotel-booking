#!/usr/bin/env bash
# Заменяет условных авторов коммитов («Разработчик Backend / Frontend») на настоящих участников.
# Запускается из «УКАЗАТЬ АВТОРОВ.bat» (значения приходят в переменных окружения).
set -e
cd "$(dirname "$0")/.."

: "${BACK_NAME:?}" "${BACK_EMAIL:?}" "${FRONT_NAME:?}" "${FRONT_EMAIL:?}"

export FILTER_BRANCH_SQUELCH_WARNING=1
git filter-branch -f --env-filter '
if [ "$GIT_AUTHOR_EMAIL" = "backend@stayeasy.local" ]; then
    export GIT_AUTHOR_NAME="$BACK_NAME" GIT_AUTHOR_EMAIL="$BACK_EMAIL"
fi
if [ "$GIT_COMMITTER_EMAIL" = "backend@stayeasy.local" ]; then
    export GIT_COMMITTER_NAME="$BACK_NAME" GIT_COMMITTER_EMAIL="$BACK_EMAIL"
fi
if [ "$GIT_AUTHOR_EMAIL" = "frontend@stayeasy.local" ]; then
    export GIT_AUTHOR_NAME="$FRONT_NAME" GIT_AUTHOR_EMAIL="$FRONT_EMAIL"
fi
if [ "$GIT_COMMITTER_EMAIL" = "frontend@stayeasy.local" ]; then
    export GIT_COMMITTER_NAME="$FRONT_NAME" GIT_COMMITTER_EMAIL="$FRONT_EMAIL"
fi
' --tag-name-filter cat -- --all

# убираем резервную копию старой истории
git for-each-ref --format="%(refname)" refs/original/ | xargs -r -n 1 git update-ref -d
git reflog expire --expire=now --all
git gc --prune=now --quiet

echo
echo "Готово. Авторы коммитов:"
git shortlog -sne --all
