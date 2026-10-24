# retrospective — NewRelic queries

> Reference for `retrospective` Step 3 (NewRelic). Read only when the NewRelic
> MCP is connected. Substitute `{app_name}`, `{feature-api-path}` and
> `{launch_date}`; the results fill the *Performance Data* section and the
> P95 / error-rate rows of *Predicted vs Actual*.

```nrql
-- Error rate for feature endpoints
SELECT percentage(count(*), WHERE error IS true) as 'Error Rate'
FROM Transaction
WHERE appName = '{app_name}'
AND request.uri LIKE '%{feature-api-path}%'
SINCE '{launch_date}' UNTIL NOW
TIMESERIES 1 day

-- P95 response time
SELECT percentile(duration, 95) as 'P95 ms'
FROM Transaction
WHERE appName = '{app_name}'
AND request.uri LIKE '%{feature-api-path}%'
SINCE '{launch_date}'

-- Request volume (adoption proxy)
SELECT count(*) as 'Requests'
FROM Transaction
WHERE request.uri LIKE '%{feature-api-path}%'
SINCE '{launch_date}' FACET dateOf(timestamp)
```
