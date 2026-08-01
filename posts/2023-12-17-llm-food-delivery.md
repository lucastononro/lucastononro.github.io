---
title: "llm-food-delivery: the agent loop was a switch statement"
dek: A voice-controlled food delivery app from December 2023, back when tool calling meant hand-written JSON schemas.
date: 2023-12-17
tags: [agents]
---

In December 2023 I wanted a chatbot that could *drive* a web interface rather than talk about one. [llm-food-delivery](https://github.com/lucastononro/llm-food-delivery) is a fake delivery app — FastAPI, Vue, SQLite, Pinecone — where you order dinner by voice and never have to touch the deliberately cluttered UI. Whisper in, `tts-1` out, `gpt-4-32k` in the middle. Every restaurant, menu and photo is synthetic: GPT-4 wrote the data, DALL·E 3 drew the food.

[Ordering dinner without touching the interface. December 2023.](/video/llm-food-delivery-demo.mp4)

## Eleven tools, by hand

Every action a user could take was mapped to a function. The schemas live in a YAML file, each entry flagged `allow: true`; an import-time pass filters those and dumps `signatures.json`, which the backend passes to OpenAI as `functions` with `function_call: "auto"`. That was the API then — no `tools`, no `tool_calls`, no parallel calls, and nothing that would run the loop on your behalf.

So the loop lived in the frontend. `handleFunctionCall` is a switch over eleven names, routing each to a Vue method that opens a restaurant page or adds a burger to a cart, then pushing the result into the chat history and asking the model again. Six of the eleven backend handlers are literally `dummy_function()` — the tool call is a UI event, not a computation.

## Memory as breadcrumbs

The model had no view of the DOM, so the interface narrated itself:

```js
registerAction("opened the restaurant page " + name + " with restaurant_uuid=" + uuid)
```

Those pile up as `@action:… at 14:02`, and `get_user_actions` hands over the last ten whenever the model needs to work out where it is. Ask it "what did I just do?" and it tells you.[^splice]

[^splice]: The implementation is `this.actions.splice(-10)`, which *removes* them. Reading the memory erased it, and in a demo nobody noticed.

---

Now I would point a computer-use model at the URL and delete all eleven functions, but I would keep the narration trick.
