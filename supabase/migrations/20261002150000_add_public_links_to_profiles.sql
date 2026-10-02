ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS public_namespace text UNIQUE,
ADD COLUMN IF NOT EXISTS custom_domain text UNIQUE;

-- Constraint para validar o formato do namespace (permitindo null ou strings com letras minúsculas, números e hífens)
ALTER TABLE profiles
ADD CONSTRAINT valid_public_namespace CHECK (
    public_namespace IS NULL OR public_namespace ~ '^[a-z0-9-]+$'
);

-- Constraint para validar formato básico do domínio personalizado (se existir)
ALTER TABLE profiles
ADD CONSTRAINT valid_custom_domain CHECK (
    custom_domain IS NULL OR custom_domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'
);
