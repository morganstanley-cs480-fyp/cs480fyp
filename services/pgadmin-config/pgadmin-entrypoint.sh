#!/bin/sh

# Copy and set permissions for pgpass file
if [ -f /tmp/pgpassfile ]; then
    cp /tmp/pgpassfile /tmp/pgpass
    chmod 600 /tmp/pgpass
    chown pgadmin:pgadmin /tmp/pgpass
    export PGPASSFILE=/tmp/pgpass
fi

# Execute the original entrypoint
exec /entrypoint.sh
