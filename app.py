from flask import Flask, render_template, request, jsonify, send_from_directory
from dotenv import load_dotenv
import os
import json
import numpy as np
import faiss
from openai import OpenAI
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Load environment variables (OpenAI API key)
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")

app = Flask(__name__, static_folder="static")

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[]
)

client = OpenAI(api_key=openai_api_key)


# Load JSON data
with open("moby_dick_2025-03-22.json", 'r') as file:
    moby_dick_data = json.load(file)

# Load the FAISS id map
with open("faiss_ids.json", 'r') as file:
    id_data = json.load(file)

# Load FAISS index
index = faiss.read_index("faiss_single.index")
print(type(index))

# Generates a verse with OpenAI using the text generated by the user
def prompt_verse_generator(text):
    prompt_text = f"""
You are Herman Melville. You write three sentence pieces of text in the style of Moby Dick when they give you a request. Here is the request:
{text}
"""
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a literary analysis expert."},
                {"role": "user", "content": prompt_text}
            ],
            temperature=0.5
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error processing verse: {e}")
        return "Sorry, something went wrong generating the verse."

# Generates a text embedding
def get_embedding(text):
    response = client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return np.array([response.data[0].embedding], dtype=np.float32)

# Finds the verse text based on an ID
def find_verse_by_id(verse_id, data):
    for chapter in data:
        for verse in chapter["verses"]:
            if verse["id"] == verse_id:
                return ({
                    "chapter_number": chapter["chapter_number"],
                    "chapter_title": chapter["title"],
                    "verse_number": verse["verse_number"],
                    "text": verse["text"]
                })
    return "Verse not found."

display_names = {
    "entitites": "Entities",
    "themes": "Themes",
    "symbolism": "Symbolism",
    "feeling": "Feeling",
    "vibe": "Vibe",
    "literary_motifs": "Literary Motifs"
}


# Flask Homepage
@app.route('/')
def home():
    return render_template('home.html')

# Flask About Page
@app.route('/about')
def about():
    return render_template('about.html')

# Flask Privacy Policy
@app.route('/privacy')
def privacy():
    return render_template('privacy.html')

# Get the tag information
@app.route('/tags.json')
def get_tags_json():
    return send_from_directory('static', 'tags.json')

# Flask main logic
@app.route('/search', methods=['POST'])
@limiter.limit("10 per minute")
def search():
    query = request.form['query']

    # Step 1: Generate fake Melville-style verse
    generated_verse = prompt_verse_generator(query)

    # Step 2: Embed the generated verse
    query_embedding = get_embedding(generated_verse)


    # Step 3: Search FAISS for the closest match
    D, I = index.search(query_embedding, k=3)

    matches = []
    for idx in I[0]:
        match_id = id_data[idx]  # Get the corresponding ID from the FAISS index
        verse = find_verse_by_id(match_id, moby_dick_data)  # Get the verse text
        matches.append(verse)  # Store it

    # Step 4: Return results
    return render_template('results.html',
                           query=query,
                           generated_verse=generated_verse,
                           matched_verses=matches)

@app.route('/tag_search', methods=['POST'])
def find_tag():
    category = request.form.get('category')
    tag = request.form.get('tag')
    pretty_category = display_names.get(category, category.replace("_", " ").title())
    found_texts = []
    for chapter in moby_dick_data:
        for verse in chapter["verses"]:
            if tag.lower() in [t.lower() for t in verse["open_ai_tags"].get(category, [])]:
                found_texts.append({
                    "chapter_number": chapter["chapter_number"],
                    "chapter_title": chapter["title"],
                    "verse_number": verse["verse_number"],
                    "text": verse["text"]
                })
    return render_template('tag-results.html',
                           category=pretty_category,
                           tag=tag,
                           found_texts=found_texts)

# 404 page handler
@app.errorhandler(404)
def page_not_found(e):
    return render_template("404.html"), 404

if __name__ == '__main__':
    app.run()



