# Preview build (not deployed)

`build_preview.py` renders the real templates through the Flask app (with OpenAI
stubbed out) into a folder of static pages, and `preview.js` stands in for
`/search` and `/tag_search` so the pages can be clicked through without a server.

    python preview/build_preview.py /some/folder
    cd /some/folder && python -m http.server

To run the real thing locally instead: `python app.py` (needs `OPENAI_API_KEY`).
Check quotations after editing copy: `python tools/check_quotes.py`.
