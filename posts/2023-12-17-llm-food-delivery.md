---
title: "llm-food-delivery: the agent loop was a switch statement"
dek: Ordering dinner by voice in 2023: eleven hand-written function schemas and a loop that lived in the browser.
date: 2023-12-17
tags: [agents]
---

In December 2023 I wanted a chatbot that could *drive* a web interface rather than talk about one. [llm-food-delivery](https://github.com/lucastononro/llm-food-delivery) is a fake delivery app — FastAPI, Vue, SQLite, Pinecone — where you order dinner by voice and never have to touch the deliberately cluttered UI. `whisper-1` in, `tts-1` out (voice `shimmer`), `gpt-4-32k` in the middle. The README calls it an "Interface-omniscient" agent, which tells you roughly what 2023 felt like.

[Ordering dinner without touching the interface. December 2023.](/video/llm-food-delivery-demo.mp4)

## Eleven schemas, by hand

Every action a user could take was mapped to a function, and each function was a YAML block I typed out myself:

```yaml
- name: get_restaurant_pages
  description: This function finds a restaurant that has similar food or name to …
  parameters:
    type: object
    properties:
      type_of_restaurant:
        type: string
        description: The type of food or restaurant that the user requested.
          E.g. Italian, Pizza, Sushi, Indian, Vegan, etc...
      quantity:
        type: integer
        description: … if the user request is broad you should set 2,3,4 or even 5
  required: [name_of_restaurant, type_of_restaurant, food_requested, …]
  allow: true
```

Eleven of those, each ending in `allow: true`. `prompts/functions/__init__.py` reads the YAML, keeps the allowed entries, pops the `allow` key and writes `signatures.json` — at import time, as a side effect of importing the package, which is the sort of thing you do when the schema list is also your build system.

What strikes me now is how much control flow lives in English. There was no way to express ordering, so the descriptions do it: `open_restaurant_page` says "This function can only be called after the function `get_restaurant_pages`", and `close_restaurant_page` says "you can check the recent actions with `get_user_actions` to verify it, before calling the function". Sequencing, preconditions and confirmation prompts, all in prose, all unenforced. Today the schema falls out of a type hint and the ordering is a graph you can look at; then it was a paragraph and a hope.[^typo]

[^typo]: `close_restaurant_page`'s description ends "goes back to the main page (menu with all the restaurants) x". The stray `x` is still sitting there in `config.yaml`, and I have never worked out what it was going to be.

## The actual call

The whole model layer is one function, and it predates everything you'd expect:

```python
model_args = {
    "model": CFG_OPENAI.get("chat_model", "gpt-4"),
    "temperature": CFG_OPENAI.get("temperature", 0),
    "max_tokens": CFG_OPENAI.get("max_tokens", 512),
    …
}

# Incrementing in cases of function calling
if len(functions) > 0:
    model_args["functions"] = functions
    model_args["function_call"] = "auto"
```

`functions`, not `tools`. `function_call: "auto"`, not `tool_choice`. The config pins `temperature: 0.0` and `max_tokens: 256`, and the system prompt closes with "You do not answer with more than 70 words", so the ceiling was a budget as much as a guard.

Three absences did most of the shaping. There are no tool-call ids, so a result goes back as a bare `{role, name, content}` triple and `PromptHandler.get_messages` has to re-shape every message so that only `function` ones carry a `name`. There are no parallel calls, so two items into the cart meant two round trips — which is exactly why `add_food_to_cart`'s description pleads "You can call this function multiple times in a row". And there was no loop: the API returned one `function_call` and then it was your problem. Every service function is wrapped in `@retry(wait=wait_random(min=1, max=5), stop=stop_after_attempt(5))`, because that was the other thing 2023 gave you a lot of.

## The loop in the browser

@diagram(llm-food-delivery-loop) The unusual bit: the cycle closes through a Vue component, not through the server.

Since nobody supplied a loop, the loop went where the tools were — the frontend. `handleFunctionCall` is a switch over eleven names:

```js
switch (functionCallSignal.name) {
  case "get_restaurant_pages":
    functionCallResponseContent = this.handleGetRestaurant(functionCallResponse);
    break;
  case "open_restaurant_page":
    functionCallResponseContent = this.handleOpenRestaurant(functionCallResponse);
    break;
  …
}
resolve({ role: "function", content: functionCallResponseContent,
          name: functionCallSignal.name });
```

and `generateAnswer` calls itself with the result appended:

```js
this.handleFunctionCall(functionCallSignal)
  .then((functionCallOutput) => {
    this.messages.push(functionCallOutput)
    this.generateAnswer(
      chatHistory=this.getChatHistory(),
      // function_call=false,
      function_call=true,
    )
  })
```

`handleOpenRestaurant` parses the uuid out of the response and then calls `this.$refs.restaurantsContainer.selectRestaurant(restaurantId)`. A tool call is a `$refs` poke. This is why the backend has `dummy_function()` — six of the eleven server handlers (`close_restaurant_page`, `get_user_actions`, `open_shopping_cart`, `close_shopping_cart`, `place_order`, `activate_handsfree`) route to a coroutine that returns `""`, and `add_food_to_cart` echoes its own arguments straight back. The round trip exists to keep the shape uniform. Nothing happens on the server because there is nothing there to happen: "open the cart" has no headless meaning.

That's the part I'd defend. If your tools are interface actions, the agent loop belongs on the same side of the wire as the interface, and the backend degrades into a schema server with a retry decorator.[^kwargs]

[^kwargs]: `chatHistory=this.getChatHistory()` looks like a Python keyword argument. In JavaScript it assigns to the enclosing scope's variable and passes the value along, which happens to do the right thing. Nothing counts the hops, either — the recursion's only brake is the model deciding to answer.

## Memory as breadcrumbs

The model can't see the DOM, so the interface narrates itself. Every component emits upward into one method with a one-line body — `this.actions.push("@action:" + msg + " at " + this.getCurrentTime())` — and the call sites are written for a reader rather than a parser: `registerAction("opened the restaurant page " + this.selectedRestaurant.name + " with restaurant_uuid=" + this.selectedRestaurant.uuid)`, or "incremented the amount of food Margherita Pizza to 2 items (in the restaurant page, not in the shopping cart)". Two vocabularies coexist: `@action:` for anything that happened in the interface, `@agent-action:` for the string handed back to the model after it caused something. The system prompt introduces the convention directly — "Every time the user or you do something ... you will receive a message starting with `@action:`" — and `get_user_actions` hands over the last ten on demand. Ask it "what did I just do?" and it goes and looks.[^splice]

Timestamps come from `hourTime + ':' + minuteTime + ':' + secondTime`, unpadded, so the log reads `at 14:2:9`. It never mattered.

[^splice]: The implementation is `JSON.stringify(this.actions.splice(-10))`, and `splice` *removes*. Reading the memory deleted it. In a demo, nobody noticed.

## Synthetic everything

Restaurants and menus are a literal Python list in `populate_fake_data.py` — Italian Bistro, Sushi House, Taco Fiesta, twenty-five of them with eight items each — which the README credits to GPT-4. The photographs are DALL·E 3, one call per row, with a prompt of magnificent brevity: `"Photorealistic zoomed picture of food: " + food.name`, skipped if the file already exists. Search is llama-index over a Pinecone index called `auto-food-order`, one document per restaurant whose text is the name, the description and every dish concatenated, retrieved with `ExactMatchFilter(key="search_type", value="restaurant")` and `top_k=quantity` — the model's own guess, from that schema above, at how many restaurants it ought to look at.

## The loop follows the tools

I've said where the loop went; the general form is the part I'd keep. Placement is settled by where the tools are, not by where the model call is convenient to make. A tool call here was a `$refs` poke, which is why six of the eleven server handlers returned `""` and the backend stayed in the cycle only for the shape of it. Anything the user could otherwise have clicked pulls the loop towards the client the same way.

The other thing is a note about my own labour. Nearly everything I typed out by hand has since become somebody else's code: the eleven YAML blocks fall out of a type hint, the sequencing I wrote as prose in a `description` field is a graph, the recursion in `generateAnswer` ships in the SDK. None of that was foresight — the platform arrived and the scaffolding stopped being mine. Which leaves the bit worth carrying forward: I only hand-write what nothing supplies yet, so whichever piece of this year's scaffolding I am proudest of having built myself is probably next.

---

The config on disk has since drifted to `gpt-4-0125-preview`, which is the only part of this that has aged as expected.
