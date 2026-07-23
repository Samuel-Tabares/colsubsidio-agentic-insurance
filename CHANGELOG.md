# Changelog

All notable changes to this project are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- ETL pipeline (`scripts/etl_afiliados.py`) that normalizes the raw affiliate CSV (1,566,028 records) into a validated data model, plus the Postgres schema (`sql/schema.sql`) to load it
- Cross-field analysis (`scripts/cross_analysis.py`) computing pairwise-complete-case Cramér's V across all 12 non-trivial affiliate fields (66 pairs), an engagement score, and a secondary ciudad analysis — embedded in the exploratory dashboard artifact
- Compressed affiliate dataset (`output/afiliados_clean.zip`, ~29 MB) for easier distribution and version control
