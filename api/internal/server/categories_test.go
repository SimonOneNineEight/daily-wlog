package server_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func createCategory(t *testing.T, ts *httptest.Server, token string, body map[string]string) *http.Response {
	t.Helper()
	payload, _ := json.Marshal(body)
	req, err := http.NewRequest(http.MethodPost, ts.URL+"/categories", bytes.NewReader(payload))
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("POST /categories: %v", err)
	}
	return resp
}

type categoryBody struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Color    string  `json:"color"`
	Icon     string  `json:"icon"`
	ParentID *string `json:"parentId"`
	Position int     `json:"position"`
}

func decodeCategory(t *testing.T, resp *http.Response) categoryBody {
	t.Helper()
	defer resp.Body.Close()
	var category categoryBody
	if err := json.NewDecoder(resp.Body).Decode(&category); err != nil {
		t.Fatalf("decode category: %v", err)
	}
	return category
}

func TestCreateCategoryAndSubcategory(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	provisionedCategory(t, ts, token)

	resp := createCategory(t, ts, token, map[string]string{"name": "園藝", "color": "#73B062"})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("status = %d, want 201", resp.StatusCode)
	}
	created := decodeCategory(t, resp)
	if created.Name != "園藝" || created.Color != "#73B062" || created.ID == "" {
		t.Errorf("category echo wrong: %+v", created)
	}
	if created.Icon != "tag" {
		t.Errorf("icon = %q, want the auto-assigned tag glyph", created.Icon)
	}
	if created.ParentID != nil {
		t.Errorf("top-level category has a parent: %+v", created)
	}
	// Five seeds exist, so the sixth top-level category lands at position 6.
	if created.Position != 6 {
		t.Errorf("position = %d, want 6 (after the five seeds)", created.Position)
	}

	subResp := createCategory(t, ts, token, map[string]string{
		"name": "多肉植物", "color": created.Color, "parentId": created.ID,
	})
	if subResp.StatusCode != http.StatusCreated {
		t.Fatalf("subcategory status = %d, want 201", subResp.StatusCode)
	}
	sub := decodeCategory(t, subResp)
	if sub.ParentID == nil || *sub.ParentID != created.ID {
		t.Errorf("subcategory parent = %v, want %s", sub.ParentID, created.ID)
	}
	// First child: sibling positions count per level.
	if sub.Position != 1 {
		t.Errorf("subcategory position = %d, want 1", sub.Position)
	}

	// The management sheet picks an icon at creation: one call, no follow-up.
	withIcon := decodeCategory(t, createCategory(t, ts, token, map[string]string{
		"name": "音樂", "color": "#A26FBD", "icon": "music",
	}))
	if withIcon.Icon != "music" {
		t.Errorf("icon = %q, want the picked glyph", withIcon.Icon)
	}
}

func TestCreateCategoryValidation(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	first := provisionedCategory(t, ts, token)

	stranger := signUpTestUser(t)
	strangerCategory := provisionedCategory(t, ts, stranger)

	sub := decodeCategory(t, createCategory(t, ts, token, map[string]string{
		"name": "健身房", "color": "#73B062", "parentId": first,
	}))

	badCases := map[string]map[string]string{
		"blank name":         {"name": "   ", "color": "#73B062"},
		"missing color":      {"name": "新類別", "color": ""},
		"blank icon":         {"name": "新類別", "color": "#73B062", "icon": "  "},
		"malformed parent":   {"name": "新類別", "color": "#73B062", "parentId": "not-a-uuid"},
		"unknown parent":     {"name": "新類別", "color": "#73B062", "parentId": "7f000000-0000-4000-8000-000000000000"},
		"stranger's parent":  {"name": "新類別", "color": "#73B062", "parentId": strangerCategory},
		"subcategory parent": {"name": "三層", "color": "#73B062", "parentId": sub.ID},
	}
	for name, body := range badCases {
		t.Run(name, func(t *testing.T) {
			resp := createCategory(t, ts, token, body)
			resp.Body.Close()
			if resp.StatusCode != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400", resp.StatusCode)
			}
		})
	}
}

func TestCreateCategoryRejectsDuplicateSiblings(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	provisionedCategory(t, ts, token)

	// 工作 is a seeded top-level name.
	resp := createCategory(t, ts, token, map[string]string{"name": "工作", "color": "#4A93C4"})
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusConflict {
		t.Fatalf("duplicate top-level status = %d, want 409", resp.StatusCode)
	}
	var body struct {
		Message string `json:"message"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil || body.Message == "" {
		t.Errorf("409 body should carry an Error message, got err=%v message=%q", err, body.Message)
	}

	// The same name is fine under a different parent level.
	parent := decodeCategory(t, createCategory(t, ts, token, map[string]string{"name": "園藝", "color": "#73B062"}))
	okResp := createCategory(t, ts, token, map[string]string{"name": "工作", "color": "#73B062", "parentId": parent.ID})
	okResp.Body.Close()
	if okResp.StatusCode != http.StatusCreated {
		t.Fatalf("same name under a parent = %d, want 201", okResp.StatusCode)
	}

	// But not twice under the same parent.
	dupResp := createCategory(t, ts, token, map[string]string{"name": "工作", "color": "#73B062", "parentId": parent.ID})
	dupResp.Body.Close()
	if dupResp.StatusCode != http.StatusConflict {
		t.Fatalf("duplicate sibling status = %d, want 409", dupResp.StatusCode)
	}
}

func TestCreateCategoryRequiresAToken(t *testing.T) {
	resp := createCategory(t, newTestServer(t), "", map[string]string{"name": "x", "color": "#000000"})
	resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
}

func TestEntrySubcategoryLinkage(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	me := decodeMe(t, postMe(t, ts, token))
	sport, food := me.Categories[1].ID, me.Categories[2].ID

	gym := decodeCategory(t, createCategory(t, ts, token, map[string]string{
		"name": "健身房", "color": "#73B062", "parentId": sport,
	}))

	stranger := signUpTestUser(t)
	strangerTop := provisionedCategory(t, ts, stranger)
	strangerSub := decodeCategory(t, createCategory(t, ts, stranger, map[string]string{
		"name": "健身房", "color": "#73B062", "parentId": strangerTop,
	}))

	// Valid: gym refines sport, and the entry echoes it on create and list.
	resp := createEntry(t, ts, token, map[string]string{
		"date": "2026-09-01", "categoryId": sport, "content": "x", "subcategoryId": gym.ID,
	})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("status = %d, want 201", resp.StatusCode)
	}
	entry := decodeEntry(t, resp)
	if entry.SubcategoryID == nil || *entry.SubcategoryID != gym.ID {
		t.Errorf("entry subcategoryId = %v, want %s", entry.SubcategoryID, gym.ID)
	}

	listResp := listEntries(t, ts, token, "2026-09-01")
	defer listResp.Body.Close()
	var list struct {
		Entries []entryBody `json:"entries"`
	}
	if err := json.NewDecoder(listResp.Body).Decode(&list); err != nil || len(list.Entries) != 1 {
		t.Fatalf("list decode err=%v entries=%d", err, len(list.Entries))
	}
	if list.Entries[0].SubcategoryID == nil || *list.Entries[0].SubcategoryID != gym.ID {
		t.Errorf("listed subcategoryId = %v, want %s", list.Entries[0].SubcategoryID, gym.ID)
	}

	// An entry without a subcategory stays optional.
	plain := decodeEntry(t, createEntry(t, ts, token, map[string]string{
		"date": "2026-09-01", "categoryId": sport, "content": "x",
	}))
	if plain.SubcategoryID != nil {
		t.Errorf("plain entry subcategoryId = %v, want null", plain.SubcategoryID)
	}

	badCases := map[string]map[string]string{
		"child of another category": {"date": "2026-09-01", "categoryId": food, "content": "x", "subcategoryId": gym.ID},
		"stranger's subcategory":    {"date": "2026-09-01", "categoryId": sport, "content": "x", "subcategoryId": strangerSub.ID},
		"malformed subcategory":     {"date": "2026-09-01", "categoryId": sport, "content": "x", "subcategoryId": "not-a-uuid"},
	}
	for name, body := range badCases {
		t.Run(name, func(t *testing.T) {
			resp := createEntry(t, ts, token, body)
			resp.Body.Close()
			if resp.StatusCode != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400", resp.StatusCode)
			}
		})
	}
}
