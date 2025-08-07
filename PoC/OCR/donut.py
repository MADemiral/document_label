import torch
from transformers import TorchAoConfig, AutoProcessor, AutoModelForVision2Seq

quantization_config = TorchAoConfig("int4_weight_only", group_size=128)
processor = AutoProcessor.from_pretrained("naver-clova-ix/donut-base-finetuned-docvqa")
model = AutoModelForVision2Seq.from_pretrained("naver-clova-ix/donut-base-finetuned-docvqa", quantization_config=quantization_config)


image = "./docs/doc1.png"
question = "What time is the coffee break?"
task_prompt = f"<s_docvqa><s_question>{question}</s_question><s_answer>"
inputs = processor(image, task_prompt, return_tensors="pt")

outputs = model.generate(
    input_ids=inputs.input_ids,
    pixel_values=inputs.pixel_values,
    max_length=512
)
answer = processor.decode(outputs[0], skip_special_tokens=True)
print(answer)