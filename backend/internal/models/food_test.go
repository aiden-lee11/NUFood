package models

import (
	"encoding/json"
	"testing"
)

func TestFlexStringAcceptsStringAndNumber(t *testing.T) {
	cases := map[string]string{
		`{"value":"210"}`: "210",
		`{"value":210}`:   "210",
		`{"value":4.5}`:   "4.5",
		`{"value":null}`:  "",
		`{"value":""}`:    "",
	}
	for in, want := range cases {
		var n struct {
			Value FlexString `json:"value"`
		}
		if err := json.Unmarshal([]byte(in), &n); err != nil {
			t.Fatalf("%s: unexpected error %v", in, err)
		}
		if string(n.Value) != want {
			t.Fatalf("%s: got %q want %q", in, string(n.Value), want)
		}
	}
}
