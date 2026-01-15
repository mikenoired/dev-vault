use crate::domain::parsers::github_parser::GitHubDocConfig;

pub fn python_config() -> GitHubDocConfig {
    GitHubDocConfig {
        name: "python".to_string(),
        display_name: "Python".to_string(),
        version: "main".to_string(),
        base_url: "https://github.com/python/cpython/tree/main/Doc".to_string(),
        available_versions: vec![
            "main".to_string(),
            "3.13".to_string(),
            "3.12".to_string(),
            "3.11".to_string(),
        ],
        ignore_files: vec![
            "README.md".to_string(),
            "LICENSE".to_string(),
            "CHANGELOG.md".to_string(),
        ],
        ignore_dirs: vec!["_sources".to_string(), ".git".to_string()],
    }
}

pub fn nextjs_config() -> GitHubDocConfig {
    GitHubDocConfig {
        name: "nextjs".to_string(),
        display_name: "Next.js".to_string(),
        version: "v16.1.2".to_string(),
        base_url: "https://github.com/vercel/next.js/tree/v16.1.2/docs".to_string(),
        available_versions: vec![
            "v16.1.2".to_string(),
            "canary".to_string(),
            "v15.1.0".to_string(),
            "v14.2.0".to_string(),
        ],
        ignore_files: vec!["README.md".to_string(), "CHANGELOG.md".to_string()],
        ignore_dirs: vec![".git".to_string(), "node_modules".to_string()],
    }
}

pub fn nuxtjs_config() -> GitHubDocConfig {
    GitHubDocConfig {
        name: "nuxtjs".to_string(),
        display_name: "Nuxt.js".to_string(),
        version: "v4.2.2".to_string(),
        base_url: "https://github.com/nuxt/nuxt/tree/v4.2.2/docs".to_string(),
        available_versions: vec![
            "v4.2.2".to_string(),
            "main".to_string(),
            "v3.13.0".to_string(),
        ],
        ignore_files: vec!["README.md".to_string(), "CHANGELOG.md".to_string()],
        ignore_dirs: vec![".git".to_string(), "node_modules".to_string()],
    }
}

pub fn bun_config() -> GitHubDocConfig {
    GitHubDocConfig {
        name: "bun".to_string(),
        display_name: "Bun".to_string(),
        version: "bun-v1.3.6".to_string(),
        base_url: "https://github.com/oven-sh/bun/tree/bun-v1.3.6/docs".to_string(),
        available_versions: vec![
            "bun-v1.3.6".to_string(),
            "main".to_string(),
            "bun-v1.2.0".to_string(),
        ],
        ignore_files: vec!["README.md".to_string(), "CHANGELOG.md".to_string()],
        ignore_dirs: vec![".git".to_string()],
    }
}

pub fn mdn_config() -> GitHubDocConfig {
    GitHubDocConfig {
        name: "mdn".to_string(),
        display_name: "MDN Web Docs".to_string(),
        version: "main".to_string(),
        base_url: "https://github.com/mdn/content/tree/main/files/en-us/web".to_string(),
        available_versions: vec!["main".to_string()],
        ignore_files: vec!["README.md".to_string(), "index.md".to_string()],
        ignore_dirs: vec![".git".to_string(), "_redirects.txt".to_string()],
    }
}

pub fn typescript_config() -> GitHubDocConfig {
    GitHubDocConfig {
        name: "typescript".to_string(),
        display_name: "TypeScript".to_string(),
        version: "v2".to_string(),
        base_url:
            "https://github.com/microsoft/TypeScript-Website/tree/v2/packages/documentation/copy/en"
                .to_string(),
        available_versions: vec!["v2".to_string(), "main".to_string()],
        ignore_files: vec!["README.md".to_string(), "CHANGELOG.md".to_string()],
        ignore_dirs: vec![".git".to_string(), "node_modules".to_string()],
    }
}

pub fn hono_config() -> GitHubDocConfig {
    GitHubDocConfig {
        name: "hono".to_string(),
        display_name: "Hono".to_string(),
        version: "main".to_string(),
        base_url: "https://github.com/honojs/website/tree/main/docs".to_string(),
        available_versions: vec!["main".to_string()],
        ignore_files: vec!["README.md".to_string(), "CHANGELOG.md".to_string()],
        ignore_dirs: vec![".git".to_string(), "node_modules".to_string()],
    }
}

pub fn elysiajs_config() -> GitHubDocConfig {
    GitHubDocConfig {
        name: "elysiajs".to_string(),
        display_name: "ElysiaJS".to_string(),
        version: "main".to_string(),
        base_url: "https://github.com/elysiajs/documentation/tree/main/docs".to_string(),
        available_versions: vec!["main".to_string()],
        ignore_files: vec!["README.md".to_string(), "CHANGELOG.md".to_string()],
        ignore_dirs: vec![".git".to_string(), "node_modules".to_string()],
    }
}

pub fn get_all_github_configs() -> Vec<GitHubDocConfig> {
    vec![
        python_config(),
        nextjs_config(),
        nuxtjs_config(),
        bun_config(),
        mdn_config(),
        typescript_config(),
        hono_config(),
        elysiajs_config(),
    ]
}
