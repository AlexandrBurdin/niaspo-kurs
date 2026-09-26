FROM postgres:16-alpine

RUN apk add --no-cache busybox-suid

COPY backup.sh /backup/backup.sh
COPY crontab /etc/crontabs/root

RUN chmod +x /backup/backup.sh

CMD ["crond", "-f", "-l", "2"]