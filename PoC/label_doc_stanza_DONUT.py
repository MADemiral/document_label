from transformers import DonutProcessor, VisionEncoderDecoderModel
import torch
from PIL import Image
import stanza
from groq import Groq
from dotenv import load_dotenv
import os

# 📌 Ortam değişkenlerini yükle (.env dosyasından)
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# 📌 Donut modelini yükle (docvqa için fine-tuned olan!)
MODEL_NAME = "naver-clova-ix/donut-base-finetuned-docvqa"
processor = DonutProcessor.from_pretrained(MODEL_NAME)
model = VisionEncoderDecoderModel.from_pretrained(MODEL_NAME)

# 📌 Cihaz (GPU varsa kullan)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)

def ocr_with_donut(image_path):
    image = Image.open(image_path).convert("RGB")
    pixel_values = processor(image, return_tensors="pt").pixel_values.to(device)

    # get_decoder_prompt_ids yerine doğrudan prompt tokenlaştırılıyor
    task_prompt = "<s_docvqa>"
    decoder_input_ids = processor.tokenizer(task_prompt, add_special_tokens=False, return_tensors="pt").input_ids
    decoder_input_ids = decoder_input_ids.to(device)

    outputs = model.generate(pixel_values, decoder_input_ids=decoder_input_ids, max_length=1024)
    text = processor.batch_decode(outputs, skip_special_tokens=True)[0]
    return text.replace(task_prompt, "").replace("</s>", "").strip()


# 📌 Stanza ile keyword çıkarımı
def extract_keywords(text, lang='tr'):
    doc = nlp(text)
    keywords = set()
    for sentence in doc.sentences:
        for ent in sentence.ents:
            keywords.add(ent.text)
    return list(keywords)

# 📌 Groq ile özet çıkar
def summarize_with_groq(text):
    client = Groq(api_key=GROQ_API_KEY)
    response = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[
            {"role": "system", "content": "You are a helpful assistant that summarizes documents. Only summarize the content. Do not write anything else. Write the summary in Turkish."},
            {"role": "user", "content": f"Summarize the following document:\n{text}"}
        ]
    )
    return response.choices[0].message.content.strip()

# 📌 Groq ile etiket önerisi al
def suggest_labels_with_groq(text):
    client = Groq(api_key=GROQ_API_KEY)
    response = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[
            {"role": "system", "content": "You are a tagging assistant. Based on the content, suggest relevant tags/labels (3 to 7 max). Only return the labels as a list. Write the tags in Turkish."},
            {"role": "user", "content": f"Suggest tags for the following document:\n{text}"}
        ]
    )
    return response.choices[0].message.content.strip()

# 📌 Tek bir dosyayı işle ve sonuçları kaydet
def process_and_save(image_path, output_txt):
    print(f"📄 Processing: {image_path}")
    text = ocr_with_donut(image_path)
    keywords = extract_keywords(text)
    summary = summarize_with_groq(text)
    labels = suggest_labels_with_groq(text)

    with open(output_txt, "w", encoding="utf-8") as f:
        f.write(f"📄 FILE: {image_path}\n\n")
        f.write("📝 OCR Text:\n" + text + "\n\n")
        f.write("🔑 Keywords (Stanza NER):\n" + ", ".join(keywords) + "\n\n")
        f.write("📚 Summary (Groq LLM):\n" + summary + "\n\n")
        f.write("🏷️ Suggested Labels (Groq):\n" + labels + "\n")

    print(f"✅ Results written to: {output_txt}")

# 📌 Ana çalıştırma
if __name__ == "__main__":
    # Stanza'yı bir kez indir ve yükle
    stanza.download('tr', processors='tokenize,ner')
    nlp = stanza.Pipeline(lang='tr', processors='tokenize,ner')

    # İstediğin belgeleri işle
    process_and_save("doc/doc1.png", "out/doc1_output_stanza_Donut.txt")
    process_and_save("doc/doc2.png", "out/doc2_output_stanza_Donut.txt")
    process_and_save("doc/doc3.png", "out/doc3_output_stanza_Donut.txt")
