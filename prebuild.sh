aws s3 cp s3://stratus-mercury-source/central-data/prod/fields/data.json data/_fields.json
aws s3 cp s3://stratus-mercury-source/central-data/prod/field_values/data.json data/_fields_values.json
aws s3 cp s3://prod-oasis-data/fields/field_summaries/data.json data/fields_summary.json

jq -s '.' data/_fields.json >  data/fields.json
jq -s '.' data/_fields_values.json >  data/fields_values.json
