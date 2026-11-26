def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_list_memos_empty(client):
    res = client.get("/api/memos/")
    assert res.status_code == 200
    assert res.json() == []


def test_create_memo(client):
    res = client.post("/api/memos/", json={"title": "テスト", "content": "内容", "published": False})
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "テスト"
    assert data["published"] is False


def test_get_memo(client):
    created = client.post("/api/memos/", json={"title": "取得テスト", "content": "内容", "published": False}).json()
    res = client.get(f"/api/memos/{created['id']}")
    assert res.status_code == 200
    assert res.json()["title"] == "取得テスト"


def test_get_memo_not_found(client):
    res = client.get("/api/memos/999")
    assert res.status_code == 404


def test_update_memo(client):
    created = client.post("/api/memos/", json={"title": "更新前", "content": "内容", "published": False}).json()
    res = client.put(f"/api/memos/{created['id']}", json={"title": "更新後", "content": "内容", "published": True})
    assert res.status_code == 200
    assert res.json()["title"] == "更新後"
    assert res.json()["published"] is True


def test_delete_memo(client):
    created = client.post("/api/memos/", json={"title": "削除テスト", "content": "内容", "published": False}).json()
    res = client.delete(f"/api/memos/{created['id']}")
    assert res.status_code == 204
    assert client.get(f"/api/memos/{created['id']}").status_code == 404


def test_list_memos_filter_published(client):
    client.post("/api/memos/", json={"title": "下書き", "content": "", "published": False})
    client.post("/api/memos/", json={"title": "投稿済み", "content": "", "published": True})

    drafts = client.get("/api/memos/?published=false").json()
    published = client.get("/api/memos/?published=true").json()

    assert all(not m["published"] for m in drafts)
    assert all(m["published"] for m in published)
