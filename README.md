
## UNDER CONSTRUCTION


### TODO Headers

Always:

'X-RateLimit-Limit' - counter.upper/limit
'X-RateLimit-Reset' - Math.ceil(limit.reset / 1000) // (slice + 1)
'X-RateLimit-Remaining' - counter.upper/limit - counter.count

Open Circuit:

'Retry-After' - recoversAfter

Rate Exceeded:

'Retry-After' - (slice + 1)
