package server_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func patchCategory(t *testing.T, ts *httptest.Server, token, id string, body map[string]string) *http.Response {
	t.Helper()
	payload, _ := json.Marshal(body)
	req, err := http.NewRequest(http.MethodPatch, ts.URL+"/categories/"+id, bytes.NewReader(payload))
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("PATCH /categories/%s: %v", id, err)
	}
	return resp
}

func deleteCategory(t *testing.T, ts *httptest.Server, token, id string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodDelete, ts.URL+"/categories/"+id, nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("DELETE /categories/%s: %v", id, err)
	}
	return resp
}

func errMessage(t *testing.T, resp *http.Response) string {
	t.Helper()
	defer resp.Body.Close()
	var body struct {
		Message string `json:"message"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode error body: %v", err)
	}
	return body.Message
}

// makeSubcategory creates a child under parentID and returns its id.
func makeSubcategory(t *testing.T, ts *httptest.Server, token, parentID, name string) string {
	t.Helper()
	resp := createCategory(t, ts, token, map[string]string{
		"name": name, "color": "#111111", "parentId": parentID,
	})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("create subcategory: status %d", resp.StatusCode)
	}
	return decodeCategory(t, resp).ID
}

func TestUpdateCategoryRenameFollowsEverywhere(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	me := decodeMe(t, postMe(t, ts, token))
	work := me.Categories[0]

	entry := decodeEntry(t, createEntry(t, ts, token, map[string]string{
		"date": "2026-06-01", "categoryId": work.ID, "content": "x",
	}))

	resp := patchCategory(t, ts, token, work.ID, map[string]string{"name": "工作坊"})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	renamed := decodeCategory(t, resp)
	if renamed.Name != "工作坊" || renamed.ID != work.ID {
		t.Errorf("rename echo wrong: %+v", renamed)
	}

	// The Entry still points at the same id, and the world shows the new name.
	after := decodeMe(t, postMe(t, ts, token))
	var found bool
	for _, c := range after.Categories {
		if c.ID == work.ID {
			found = true
			if c.Name != "工作坊" {
				t.Errorf("category name = %q, want 工作坊", c.Name)
			}
		}
	}
	if !found {
		t.Fatal("renamed category missing from /me")
	}
	day := listDay(t, ts, token, "2026-06-01")
	if len(day) != 1 || day[0].CategoryID != entry.CategoryID {
		t.Errorf("entry no longer references the renamed category: %+v", day)
	}
}

func TestUpdateCategoryColorCascadesToChildren(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	me := decodeMe(t, postMe(t, ts, token))
	sport := me.Categories[1]
	subID := makeSubcategory(t, ts, token, sport.ID, "健身房")

	resp := patchCategory(t, ts, token, sport.ID, map[string]string{"color": "#123456"})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	resp.Body.Close()

	after := decodeMe(t, postMe(t, ts, token))
	for _, c := range after.Categories {
		if c.ID == subID && c.Color != "#123456" {
			t.Errorf("child stored color = %q, want the parent's new color", c.Color)
		}
		if c.ID == sport.ID && c.Color != "#123456" {
			t.Errorf("parent color = %q, want #123456", c.Color)
		}
	}
}

func TestUpdateCategoryValidation(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	me := decodeMe(t, postMe(t, ts, token))
	work, sport := me.Categories[0], me.Categories[1]
	subID := makeSubcategory(t, ts, token, sport.ID, "健身房")

	stranger := signUpTestUser(t)
	provisionedCategory(t, ts, stranger)

	cases := map[string]struct {
		id   string
		body map[string]string
		want int
	}{
		"empty patch":          {work.ID, map[string]string{}, 400},
		"empty name":           {work.ID, map[string]string{"name": "  "}, 400},
		"empty color":          {work.ID, map[string]string{"color": ""}, 400},
		"empty icon":           {work.ID, map[string]string{"icon": ""}, 400},
		"color on subcategory": {subID, map[string]string{"color": "#222222"}, 400},
		"icon on subcategory":  {subID, map[string]string{"icon": "coffee"}, 400},
		"duplicate sibling":    {work.ID, map[string]string{"name": sport.Name}, 409},
		"malformed id":         {"nope", map[string]string{"name": "x"}, 404},
		"unknown id":           {"7f000000-0000-4000-8000-000000000009", map[string]string{"name": "x"}, 404},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			resp := patchCategory(t, ts, token, c.id, c.body)
			resp.Body.Close()
			if resp.StatusCode != c.want {
				t.Fatalf("status = %d, want %d", resp.StatusCode, c.want)
			}
		})
	}

	resp := patchCategory(t, ts, stranger, work.ID, map[string]string{"name": "x"})
	resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("stranger's patch status = %d, want 404", resp.StatusCode)
	}
}

func TestDeleteCategoryLifecycle(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	me := decodeMe(t, postMe(t, ts, token))
	work, sport, food := me.Categories[0], me.Categories[1], me.Categories[2]

	// In use as an Entry's category → the designed 409.
	decodeEntry(t, createEntry(t, ts, token, map[string]string{
		"date": "2026-06-02", "categoryId": work.ID, "content": "x",
	}))
	resp := deleteCategory(t, ts, token, work.ID)
	if resp.StatusCode != http.StatusConflict {
		t.Fatalf("in-use delete status = %d, want 409", resp.StatusCode)
	}
	if msg := errMessage(t, resp); msg != "category in use" {
		t.Errorf("in-use message = %q, want the stable code", msg)
	}

	// Still has children → its own 409.
	subID := makeSubcategory(t, ts, token, sport.ID, "健身房")
	resp = deleteCategory(t, ts, token, sport.ID)
	if resp.StatusCode != http.StatusConflict {
		t.Fatalf("has-children delete status = %d, want 409", resp.StatusCode)
	}
	if msg := errMessage(t, resp); msg != "category has children" {
		t.Errorf("has-children message = %q, want the stable code", msg)
	}

	// In use as a refinement → in use, even though it's a child.
	decodeEntry(t, createEntry(t, ts, token, map[string]string{
		"date": "2026-06-02", "categoryId": sport.ID, "subcategoryId": subID, "content": "x",
	}))
	resp = deleteCategory(t, ts, token, subID)
	if resp.StatusCode != http.StatusConflict {
		t.Fatalf("refinement delete status = %d, want 409", resp.StatusCode)
	}
	if msg := errMessage(t, resp); msg != "category in use" {
		t.Errorf("refinement message = %q, want category in use", msg)
	}

	// Unused → deleted and gone from the world.
	resp = deleteCategory(t, ts, token, food.ID)
	resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("unused delete status = %d, want 204", resp.StatusCode)
	}
	after := decodeMe(t, postMe(t, ts, token))
	for _, c := range after.Categories {
		if c.ID == food.ID {
			t.Error("deleted category still listed")
		}
	}

	stranger := signUpTestUser(t)
	provisionedCategory(t, ts, stranger)
	resp = deleteCategory(t, ts, stranger, sport.ID)
	resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("stranger delete status = %d, want 404", resp.StatusCode)
	}
	resp = deleteCategory(t, ts, token, "nope")
	resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("malformed delete status = %d, want 404", resp.StatusCode)
	}
}

func TestMeReportsUsageFlags(t *testing.T) {
	ts := newTestServer(t)
	token := signUpTestUser(t)
	me := decodeMe(t, postMe(t, ts, token))
	work, sport := me.Categories[0], me.Categories[1]
	makeSubcategory(t, ts, token, sport.ID, "健身房")
	decodeEntry(t, createEntry(t, ts, token, map[string]string{
		"date": "2026-06-03", "categoryId": work.ID, "content": "x",
	}))

	resp := postMe(t, ts, token)
	defer resp.Body.Close()
	var body struct {
		Categories []struct {
			ID          string `json:"id"`
			InUse       bool   `json:"inUse"`
			HasChildren bool   `json:"hasChildren"`
		} `json:"categories"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode /me: %v", err)
	}
	flags := map[string][2]bool{}
	for _, c := range body.Categories {
		flags[c.ID] = [2]bool{c.InUse, c.HasChildren}
	}
	if flags[work.ID] != [2]bool{true, false} {
		t.Errorf("work flags = %v, want in use, no children", flags[work.ID])
	}
	if flags[sport.ID] != [2]bool{false, true} {
		t.Errorf("sport flags = %v, want unused, has children", flags[sport.ID])
	}
}

func TestCategoryEditingRequiresAToken(t *testing.T) {
	ts := newTestServer(t)
	resp := patchCategory(t, ts, "", "x", map[string]string{"name": "x"})
	resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("patch status = %d, want 401", resp.StatusCode)
	}
	resp = deleteCategory(t, ts, "", "x")
	resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("delete status = %d, want 401", resp.StatusCode)
	}
}
