# Models

> Description of existing models

<Tabs>
  <Tab title="Image to Video [DoP]">
    The DoP service converts static images into dynamic 5-second videos using advanced AI motion synthesis.
    DoP takes your input image and applies realistic motion effects to create engaging video content.

    <CardGroup cols={2}>
      <Card title="Custom Images" icon="image" color="#3b82f6">
        Upload your own images to be transformed into videos

        * **Supported formats:** JPG, PNG, WebP
        * **Recommended resolution:** 1024x1024 or higher
        * **Aspect ratios:** Square, landscape, or portrait
      </Card>

      <Card title="Motion Effects" icon="play" color="#8b5cf6">
        Apply pre-built motion templates from our library

        * **Browse effects:** [higgsfield.ai/create/video/select](https://higgsfield.ai/create/video/select?for=motion\&model=higgsfield)
        * **Pass motion ID** in API parameters
        * **Professional templates** for various use cases
      </Card>
    </CardGroup>

    Go beyond static shots and take full control of the camera with the [Higgsfield Motion Library](https://higgsfield.ai/create/video/select?for=motion\&model=higgsfield). The platform includes a library of motion presets that make it easy to create professional-quality videos.
    The collection covers a wide range of dynamic camera movements such as dolly-ins, crash zooms, and overhead shots along with visual effects designed for cinematic impact. To apply a motion, simply reference its id in your video generation request.

    Pre-designed motion templates are available to create specific video styles:

    <Tabs>
      <Tab title="Camera Movement">
        * Zoom in/out effects
        * Pan left/right motions
        * Tilt and rotation movements
        * Dolly forward/backward
      </Tab>

      <Tab title="Object Animation">
        * Parallax depth effects
        * Floating animations
        * Ambient movements
        * Dynamic lighting changes
      </Tab>

      <Tab title="Environmental">
        * Wind and weather effects
        * Particle movements
        * Atmospheric animations
        * Natural motion simulation
      </Tab>
    </Tabs>

    <Columns cols={3}>
      <video autoPlay loop muted className="w-full aspect-video rounded-xl" src="https://static.higgsfield.ai/a76f2e99-0a41-4fdf-934d-9c95b0ee85bf.mp4" />

      <video autoPlay loop muted className="w-full aspect-video rounded-xl" src="https://static.higgsfield.ai/fe5d8fa7-a639-4167-a819-44877788300e.mp4" />

      <video autoPlay loop muted className="w-full aspect-video rounded-xl" src="https://static.higgsfield.ai/d66685ce-8c2b-4aeb-8d4a-195d474c7eca.mp4" />
    </Columns>

    ## Usage Workflow

    <Steps>
      <Step title="Prepare Input">
        Add image URL as source image
      </Step>

      <Step title="Configure Parameters">
        Set motion ID (if using effects) and other generation parameters
      </Step>

      <Step title="Generate Video">
        Process the request - generation typically takes 30-60 seconds
      </Step>

      <Step title="Download Result">
        Receive a 5-second MP4 video with applied motion effects
      </Step>
    </Steps>
  </Tab>

  <Tab title="Text to Image [Soul]">
    SOUL is the foundational engine of the Higgsfield visual suite, a model that renders images with realism and sophisticated aesthetics. Its true power is unlocked when paired with our Soul ID technology, which allows you to maintain perfect character consistency across countless new scenes and styles.

    ### Examples

    <Columns cols={3}>
      <Frame>
                <img src="https://mintcdn.com/private-hf/RgB2SXhCxJ6KplRT/images/soul4.png?fit=max&auto=format&n=RgB2SXhCxJ6KplRT&q=85&s=f63fd7ccbd03b1508a93427554a0107b" alt="examples" width="2016" height="1344" data-path="images/soul4.png" srcset="https://mintcdn.com/private-hf/RgB2SXhCxJ6KplRT/images/soul4.png?w=280&fit=max&auto=format&n=RgB2SXhCxJ6KplRT&q=85&s=dad50b83de0a25aef078fa1ef501bb7b 280w, https://mintcdn.com/private-hf/RgB2SXhCxJ6KplRT/images/soul4.png?w=560&fit=max&auto=format&n=RgB2SXhCxJ6KplRT&q=85&s=d2c43c2dac58c3cd6a6e6e47e10378d6 560w, https://mintcdn.com/private-hf/RgB2SXhCxJ6KplRT/images/soul4.png?w=840&fit=max&auto=format&n=RgB2SXhCxJ6KplRT&q=85&s=65d913dbcfdd6436cb581f8ed4511fa2 840w, https://mintcdn.com/private-hf/RgB2SXhCxJ6KplRT/images/soul4.png?w=1100&fit=max&auto=format&n=RgB2SXhCxJ6KplRT&q=85&s=ce4e83e6d890377c73eeed5d7ed3250b 1100w, https://mintcdn.com/private-hf/RgB2SXhCxJ6KplRT/images/soul4.png?w=1650&fit=max&auto=format&n=RgB2SXhCxJ6KplRT&q=85&s=c36eea295d7a91858e2d90ebb1f13a93 1650w, https://mintcdn.com/private-hf/RgB2SXhCxJ6KplRT/images/soul4.png?w=2500&fit=max&auto=format&n=RgB2SXhCxJ6KplRT&q=85&s=4af0304696a7f42b64ea979dac5f713f 2500w" data-optimize="true" data-opv="2" />
      </Frame>

      <Frame>
                <img src="https://mintcdn.com/private-hf/RgB2SXhCxJ6KplRT/images/soul5.png?fit=max&auto=format&n=RgB2SXhCxJ6KplRT&q=85&s=ebbdfb455b9667c54397cc43fdb3c5da" alt="examples" width="2016" height="1344" data-path="images/soul5.png" srcset="https://mintcdn.com/private-hf/RgB2SXhCxJ6KplRT/images/soul5.png?w=280&fit=max&auto=format&n=RgB2SXhCxJ6KplRT&q=85&s=a63959e57e56af2d7b4da5e0e8a65da8 280w, https://mintcdn.com/private-hf/RgB2SXhCxJ6KplRT/images/soul5.png?w=560&fit=max&auto=format&n=RgB2SXhCxJ6KplRT&q=85&s=996b1a0afd263197c2bcd031df521383 560w, https://mintcdn.com/private-hf/RgB2SXhCxJ6KplRT/images/soul5.png?w=840&fit=max&auto=format&n=RgB2SXhCxJ6KplRT&q=85&s=74c4181501ccfd6392cc85fad177536b 840w, https://mintcdn.com/private-hf/RgB2SXhCxJ6KplRT/images/soul5.png?w=1100&fit=max&auto=format&n=RgB2SXhCxJ6KplRT&q=85&s=da23412483dd84677c612e12f519d136 1100w, https://mintcdn.com/private-hf/RgB2SXhCxJ6KplRT/images/soul5.png?w=1650&fit=max&auto=format&n=RgB2SXhCxJ6KplRT&q=85&s=1123ea715b6324cb2a4a63a37ff653f6 1650w, https://mintcdn.com/private-hf/RgB2SXhCxJ6KplRT/images/soul5.png?w=2500&fit=max&auto=format&n=RgB2SXhCxJ6KplRT&q=85&s=516123a29dbc12552e30bd490f9dd350 2500w" data-optimize="true" data-opv="2" />
      </Frame>

      <Frame>
        ![examples](https://higgsfield.ai/_next/image?url=https%3A%2F%2Fdqv0cqkoy5oj7.cloudfront.net%2Fuser_2vtxM3DRcDcQIjpmiCpUDF2wcAT%2Fd069baaf-d970-4a99-8980-3f3a001c21e1.png\&w=3840\&q=75)
      </Frame>
    </Columns>

    Prompts:

    <AccordionGroup>
      <Accordion title="Prompt for 1st image">
        > Midday sun fractures sharply across uneven jagged stones, casting deep chiaroscuro undercutting a cropped silk top and raw-edge denim tailored with deliberate fray—each fabric thread and rough indigo weave etched in vivid relief. The East Asian model stands statuesque, her gaze piercing forward with a quiet detachment that charges the stillness, lips parted ever so faintly, hair tousled naturally by a sea breeze that glosses skin with subtle chiaroscuro highlights.
        > Sunlight slices diagonally, a harsh key from above softened slightly by a golden fill to maintain detail in shadow-laced crevices of both stone and garment; deep shadows pool beneath the folds of distressed jeans, while the cropped top’s fine silk fibers catch and hold dappled gleams. Her expression twists the surrounding heat into inertia—an aloof statement echoing minimalist nonchalance.
        > Compositionally, the lens hovers at eye-level with a 50 mm focal balance, center framing the model as she occupies the ground’s fractured grid in crisp focus, edges yielding to a gentle vignette blur that frames without harshness. The jagged rocks stretch beyond, their stark textures seamlessly merging into shadow, amplifying the urban-wild contrast between structured denim and nature’s raw palette.
        > The image hums with a digital clarity reminiscent of sharp, film-like stillness where tactile grit and human presence fuse, retaining a subtle softness in the periphery to counterbalance the sharp sunlit crystal textures—high-fashion editorial, hyper-real texture fidelity
      </Accordion>

      <Accordion title="Prompt for 2nd image">
        > A candid iPhone-style capture of a pale-skinned man with light freckles standing in a cold urban alley flanked by reflective glass skyscrapers. He wears a slate-gray field jacket layered over a cozy turtleneck sweater and structured navy cargo pants, the textures of the fabrics and subtle skin details clearly visible. Soft, cool daylight reflects naturally off the glass facades, casting gentle ambient light and nuanced shadows. The framing is slightly tilted and asymmetrical, evoking a spontaneous, casual snapshot with natural posture and minimal self-awareness. The scene's overall tone is muted and cool, emphasizing genuine urban atmosphere and textural realism.
      </Accordion>

      <Accordion title="Prompt for 3rd image">
        > A figure wearing a slightly oversized charcoal hoodie with the text "illicitbloc London" subtly visible across the back pairs it with black athletic pants and well-worn New Balance sneakers, manifesting a relaxed sporty-chic style. The individual holds a sleek, black duffel bag in one hand and a gleaming silver Rimowa aluminum suitcase in the other, contrasting tactilely with the dark fabric of the outfit. They are captured mid-stride near the glass entrance of a contemporary German airport terminal characterized by muted architectural tones and metallic surfaces. Soft, overcast daylight filters through large windows and reflects off the polished suitcase, casting gentle, natural shadows that enhance the texture of fabric, skin, and surrounding surfaces. The image is framed casually with a slight tilt and off-center composition, evoking a spontaneous candid moment typical of iPhone photography, highlighting the quiet, minimalist atmosphere infused with ambient urban and travel authenticity.
      </Accordion>
    </AccordionGroup>

    <Note>
      Want more examples? Visit [higgsield.ai](https://higgsfield.ai/soul)
    </Note>

    ### Consistent character \[Soul ID] + Image reference

    Our API provides full support for character consistency through the Soul ID. To establish a new character, utilize the designated creation endpoints; we recommend submitting a diverse set of high-quality reference images to ensure optimal standard.
    After creation, you will receive a unique character ID. To feature them in a new generation, pass this ID to the custom\_reference\_id parameter in your request, and your character will be integrated into the scene.

    Use a source image as input, enhance it with your prompt, and generate the desired result. Example:

    <Columns cols={2}>
      <Frame>
        ![first example](https://d8j0ntlcm91z4.cloudfront.net/content_user_id/0dff46b3-54a1-4f87-ae8c-4d076271a968.jpeg)
      </Frame>

      <Frame>
                <img src="https://mintcdn.com/private-hf/RgB2SXhCxJ6KplRT/images/soul7.png?fit=max&auto=format&n=RgB2SXhCxJ6KplRT&q=85&s=2228d51c362dbb52534777c1584d3409" alt="first result" width="2048" height="1152" data-path="images/soul7.png" srcset="https://mintcdn.com/private-hf/RgB2SXhCxJ6KplRT/images/soul7.png?w=280&fit=max&auto=format&n=RgB2SXhCxJ6KplRT&q=85&s=6f10b5d6e8d635218e7d47268f323d96 280w, https://mintcdn.com/private-hf/RgB2SXhCxJ6KplRT/images/soul7.png?w=560&fit=max&auto=format&n=RgB2SXhCxJ6KplRT&q=85&s=02bfea925d93a8a0ceb06870c99403ed 560w, https://mintcdn.com/private-hf/RgB2SXhCxJ6KplRT/images/soul7.png?w=840&fit=max&auto=format&n=RgB2SXhCxJ6KplRT&q=85&s=470d8467eb4e91dfa10bdf45522a4664 840w, https://mintcdn.com/private-hf/RgB2SXhCxJ6KplRT/images/soul7.png?w=1100&fit=max&auto=format&n=RgB2SXhCxJ6KplRT&q=85&s=5d1bd275f55d827f662d267b20b2d317 1100w, https://mintcdn.com/private-hf/RgB2SXhCxJ6KplRT/images/soul7.png?w=1650&fit=max&auto=format&n=RgB2SXhCxJ6KplRT&q=85&s=c7bc3f0267757d2438304904f3ce80ce 1650w, https://mintcdn.com/private-hf/RgB2SXhCxJ6KplRT/images/soul7.png?w=2500&fit=max&auto=format&n=RgB2SXhCxJ6KplRT&q=85&s=2ddb6cb14d0b05a63b3ffc70e202d11e 2500w" data-optimize="true" data-opv="2" />
      </Frame>
    </Columns>

    ```curl curl example above
        curl --location 'https://platform.higgsfield.ai/v1/text2image/soul' \
        --header 'hf-api-key: {api-key}' \
        --header 'hf-secret: {secret}' \
        --header 'Content-Type: application/json' \
        --header 'Accept: application/json' \
        --data '{
            "params": {
                "prompt": "A spontaneous candid image of a female model with sharp eyes and porcelain skin sitting naturally on a minimalist white metal bench in a sculptural desert garden, wearing a crisp sand-colored suit featuring a boxy silhouette and square-toed boots. The late afternoon sunlight casts soft, warm natural lighting across her skin and the fabric'\''s fine texture, highlighting subtle shadows and natural imperfections. Her relaxed, minimally aware expression and casual posture evoke genuine intimacy, while the surrounding desert plants and sculptural elements add authentic environmental detail. The composition is casually tilted and framed to emphasize spontaneous realism, characteristic of high-quality iPhone photography with natural depth and texture.",
                "width_and_height": "2048x1152",
                "enhance_prompt": false,
                "quality": "1080p",
                "batch_size": 1,
                "style_id": "1cb4b936-77bf-4f9a-9039-f3d349a4cdbe",
                "custom_reference_id": "3eb3ad49-775d-40bd-b5e5-38b105108780",
                "image_reference": {
                    "type": "image_url",
                    "image_url": "https://d8j0ntlcm91z4.cloudfront.net/content_user_id/0dff46b3-54a1-4f87-ae8c-4d076271a968.jpeg"
                }
            }
        }'
    ```
  </Tab>

  <Tab title="Create character [Soul ID]">
    ## Overview

    The Character API allows you to create unique characters based on uploaded photographs. These characters can then be used to generate images with the **Soul** model.

    ## Photo Requirements

    To successfully create a character, you need to upload a **high-quality photo** where:

    <CardGroup cols={2}>
      <Card title="Required" icon="check" color="#16a34a">
        * **Face is clearly visible** and takes up a significant portion of the frame
        * **Good lighting** - face is not in shadow
        * **Face directed toward camera** (front-facing or slight turn)
        * **Minimal obstructions** - no sunglasses, masks, or hands covering face
        * **High resolution** - minimum 512x512 pixels
      </Card>

      <Card title="Avoid" icon="x" color="#dc2626">
        * Blurry or very small faces
        * Heavy shadows on face
        * Profile view (side angle)
        * Closed eyes
        * Low quality/resolution images
      </Card>
    </CardGroup>

    ## Usage Workflow

    <Steps>
      <Step title="Create Character">
        Upload a photo through the Character API to create a new character
      </Step>

      <Step title="Get Character ID">
        Retrieve the `id` from the API response
      </Step>

      <Step title="Generate Images">
        Use the `id` when generating images with the Soul model (field `custom_reference_id`).
      </Step>
    </Steps>

    ## API Reference

    For detailed API documentation and endpoints, visit: [docs.higgsfield.ai/api-reference/character/create-character](https://docs.higgsfield.ai/api-reference/character/create-character)

    <Note>
      The quality of the source photo directly impacts the quality of generated images featuring the character.
    </Note>
  </Tab>
</Tabs>

***

## Generation result

When you make a request for video or image generation, the system returns an `id` in the response. This `id` is used to retrieve the result after processing is complete.
Currently, we only support polling. Webhooks are not yet available.

After submitting a generation request, the system creates an object called `JobSet`. Its purpose is to store the status and results of your request.
You can retrieve the result by sending a [request](/api-reference/get-generation-results).

<Warning>
  The retention period for generation results is 7 days.
</Warning>


API Key ID 184a4cd0-2084-4d5c-a5e6-783e89bf96b1
API Key Secret 5c08efefca0d3a2766db52591eb847b4e654719e226b360bc90074e423657a8c