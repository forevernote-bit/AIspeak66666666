from flask import Flask, render_template, request, jsonify
from google import genai
import speech_recognition as sr
import subprocess
import os
import tempfile
import json
import shutil

app = Flask(__name__)

client = genai.Client()
MODEL = "gemini-3.5-flash-lite"


FFMPEG_PATH = shutil.which("ffmpeg") or "ffmpeg"
@app.route("/")
def home():
    return render_template("index.html")


@app.route("/analyze", methods=["POST"])
def analyze():
    if "audio" not in request.files:
        return jsonify({"error": "Audio topilmadi"}), 400

    webm_path = os.path.join(tempfile.gettempdir(), "ielts_audio.webm")
    wav_path = os.path.join(tempfile.gettempdir(), "ielts_audio.wav")

    request.files["audio"].save(webm_path)

    try:
        subprocess.run(
            [FFMPEG_PATH, "-y", "-i", webm_path,
             "-ar", "16000", "-ac", "1", wav_path],
            check=True,
            capture_output=True
        )

        recognizer = sr.Recognizer()

        with sr.AudioFile(wav_path) as source:
            audio = recognizer.record(source)

        text = recognizer.recognize_google(audio, language="en-US")

        prompt = f"""
You are an IELTS Speaking examiner and English teacher.

Analyze this student's IELTS Speaking answer:

{text}

Return ONLY valid JSON:

{{
  "band": "4.0",
  "grammar": [
    {{
      "mistake": "I born",
      "correction": "I was born",
      "explanation": "Use 'was born' when talking about your birthplace."
    }}
  ],
  "vocabulary": [
    {{
      "word": "picturesque",
      "meaning": "very beautiful and scenic"
    }}
  ],
  "fluency": "Short feedback about fluency and hesitation.",
  "sentence_structure": "Short feedback about sentence structure.",
  "better_answer": "A natural improved version of the student's answer.",
  "tips": [
    "Speak more slowly.",
    "Avoid repeating words.",
    "Use complete sentences."
  ]
}}

Rules:
- Keep the answer concise.
- Do not invent information.
- Do not assume unknown place names.
- Band is only an estimated score.
"""

        response = client.models.generate_content(
            model=MODEL,
            contents=prompt
        )

        result = json.loads(response.text.strip().replace("```json", "").replace("```", ""))

        return jsonify({
            "transcript": text,
            "analysis": result
        })

    except sr.UnknownValueError:
        return jsonify({"error": "Nutqni tushunib bo'lmadi."}), 400

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        for path in [webm_path, wav_path]:
            if os.path.exists(path):
                os.remove(path)

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )