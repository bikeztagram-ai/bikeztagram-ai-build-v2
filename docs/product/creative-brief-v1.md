# Creative Brief Compiler v1

The creative brief compiler converts a user's natural-language production request plus media references into a provider-neutral brief before generation.

## Why it exists

Raw prompts are too ambiguous for a general-purpose AI filmmaker. The compiler separates:

- user intent
- output format
- mood
- duration/aspect ratio
- reference roles
- continuity requirements
- creative constraints

Generation providers should consume the compiled brief rather than deciding these semantics independently.

## Reference roles

References may represent a subject, character, object, environment, composition, motion, lighting or other explicitly defined role. A reference's role is not inferred as ownership or permission.

## Originality

The compiler preserves creative intent while explicitly preferring original expression over direct imitation of protected works. The safety/rights layer remains authoritative and runs before generation.

## Next integration

`user request -> safety/rights -> creative brief -> media intelligence -> storyboard -> provider routing -> generation -> quality check -> export`
