-- Create the CaffeineCode role if it doesn't exist
-- This ensures the role exists even when using an existing database volume
-- This script should be run as the postgres superuser
-- Note: This script runs in the context of POSTGRES_DB (codedoc) during Docker initialization

DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'CaffeineCode') THEN
        CREATE ROLE "CaffeineCode" WITH LOGIN PASSWORD 'password' SUPERUSER;
        RAISE NOTICE 'Role CaffeineCode created successfully';
    ELSE
        -- Update password in case it changed
        ALTER ROLE "CaffeineCode" WITH PASSWORD 'password' SUPERUSER;
        RAISE NOTICE 'Role CaffeineCode already exists, password updated';
    END IF;
END
$$;

-- Grant necessary privileges to the CaffeineCode role on the current database
-- The database is created automatically by Docker using POSTGRES_DB=codedoc
GRANT ALL PRIVILEGES ON DATABASE codedoc TO "CaffeineCode";
