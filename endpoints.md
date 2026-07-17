---
title: Default module
language_tabs:
  - shell: Shell
  - http: HTTP
  - javascript: JavaScript
  - ruby: Ruby
  - python: Python
  - php: PHP
  - java: Java
  - go: Go
toc_footers: []
includes: []
search: true
code_clipboard: true
highlight_theme: darkula
headingLevel: 2
generator: "@tarslib/widdershins v4.0.30"

---

# Default module

Base URLs:

# Authentication

- HTTP Authentication, scheme: bearer

# Auth

## POST Register

POST /register/

> Body Parameters

```json
{
    "user": "test_user",
    "password": "testpassword1234"
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|body|body|object| yes |none|

> Response Examples

> 200 Response

```json
{"id":"af2cf016-9ab7-4c4c-ba70-dec9312306fd","username":"luishfr","createdAt":"2026-07-10T23:22:50.907Z"}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

## POST Not Created User Auth

POST /auth/

> Body Parameters

```json
{
    "user": "no_created",
    "password": "very_new_password"
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|body|body|object| yes |none|

> Response Examples

> 200 Response

```json
{"jwt":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZjJjZjAxNi05YWI3LTRjNGMtYmE3MC1kZWM5MzEyMzA2ZmQiLCJ1c2VybmFtZSI6Imx1aXNoZnIiLCJpYXQiOjE3ODM3Mjk1MzIsImV4cCI6MTc4MzczNjczMn0.HHEcY1JnszY2NNuW3laUpqmSfFttu7resgXASCzW63A"}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

# Networks

## GET Get Networks list

GET /networks/

> Response Examples

> 200 Response

```json
[]
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

## POST Create Network

POST /networks/

> Body Parameters

```json
{
    "title": "the new era",
    "description": "follow me my fellas",
    "tags": [
        "default", "standard", "new"
    ],
    "accessMode": "public",
    "updateMode": "centralized"
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|body|body|object| yes |none|

> Response Examples

> 200 Response

```json
{"id":"790e2156-e502-4b6a-87a2-02ec0c24382a","title":"the new era","description":"follow me my fellas","tags":["default","standard","new"],"ownerId":"3dd5fca5-e770-4e13-932b-0b53a256c017","accessMode":"public","updateMode":"centralized","activeFileId":null,"createdAt":"2026-07-11T17:08:53.893Z"}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

## POST Requesting Access to Network

POST /networks/3ee2f93c-46f1-445c-a59c-df0c85233c7d/access-requests/

> Response Examples

> 200 Response

```json
{"status":"pending"}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

## GET Get Access Requests

GET /networks/3ee2f93c-46f1-445c-a59c-df0c85233c7d/access-requests/

> Body Parameters

```json
{}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|body|body|object| yes |none|

> Response Examples

> 200 Response

```json
[{"userId":"f88bb9cd-4654-442e-a0b1-f05745afb3dc","requestedAt":"2026-07-11T17:22:04.258Z"}]
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

## POST Decide Request Access

POST /networks/3ee2f93c-46f1-445c-a59c-df0c85233c7d/access-decisions/

> Body Parameters

```json
{
    "userId": "f88bb9cd-4654-442e-a0b1-f05745afb3dc",
    "decision": "approve"
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|body|body|object| yes |none|

> Response Examples

> 200 Response

```json
[{"userId":"f88bb9cd-4654-442e-a0b1-f05745afb3dc","requestedAt":"2026-07-11T17:22:04.258Z"}]
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

# Heartbeat

## POST Heartbeat

POST /heartbeat

> Body Parameters

```json
{
    "networkId": "3ee2f93c-46f1-445c-a59c-df0c85233c7d",
    "peerId": "peerId_generated_from_webtorrent_client"
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|body|body|object| yes |none|

> Response Examples

> 200 Response

```json
{"networkId":"3ee2f93c-46f1-445c-a59c-df0c85233c7d","peerId":"peerId_generated_from_webtorrent_client","activePeers":1,"shouldActivateFallback":true}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

## GET Get Peers

GET /networks/3ee2f93c-46f1-445c-a59c-df0c85233c7d/peers/

> Response Examples

> 200 Response

```json
{"networkId":"3ee2f93c-46f1-445c-a59c-df0c85233c7d","activePeers":[]}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

# Files

## POST Announce File

POST /networks/3ee2f93c-46f1-445c-a59c-df0c85233c7d/files/

> Body Parameters

```json
{
    "infoHash": "infoHash_generated_from_webtorrent_client",
    "filename": "name",
    "magnet": "magnet_generated_from_webtorrent_client",
    "size": 999
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|body|body|object| yes |none|

> Response Examples

> 200 Response

```json
{"fileId":"7263c4c8-3579-45e5-b303-c78df456c5a1","versionId":"2d97904a-f9d4-4b83-931d-14354d866430","lamportTs":2}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

## POST Announce Version

POST /networks/3ee2f93c-46f1-445c-a59c-df0c85233c7d/versions/

> Body Parameters

```json
{
    "infoHash": "infoHash_generated_from_webtorrent_client",
    "filename": "name2.txt",
    "magnet": "magnet_generated_from_webtorrent_client",
    "size": 999,
    "parentVersionId": "17e043c9-c9a9-4e54-9ab2-2fe0665d3109"
}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|body|body|object| yes |none|

> Response Examples

> 200 Response

```json
{"fileId":"7263c4c8-3579-45e5-b303-c78df456c5a1","versionId":"2d97904a-f9d4-4b83-931d-14354d866430","lamportTs":2}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

## GET Get File Versions

GET /networks/3ee2f93c-46f1-445c-a59c-df0c85233c7d/versions/

> Body Parameters

```json
{}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|body|body|object| yes |none|

> Response Examples

> 200 Response

```json
{"fileId":"7263c4c8-3579-45e5-b303-c78df456c5a1","versionId":"2d97904a-f9d4-4b83-931d-14354d866430","lamportTs":2}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

## GET Get Current File

GET /networks/3ee2f93c-46f1-445c-a59c-df0c85233c7d/file/

> Body Parameters

```json
{}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|body|body|object| yes |none|

> Response Examples

> 200 Response

```json
{"fileId":"7263c4c8-3579-45e5-b303-c78df456c5a1","versionId":"2d97904a-f9d4-4b83-931d-14354d866430","lamportTs":2}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### Responses Data Schema

# Data Schema

