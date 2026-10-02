# Pochaco sprite

`pochaco.png` was created with the built-in image generation tool in style-transfer mode, using the user-provided Pochaco photograph as the identity reference. It is shared by the header logo, editor tool, level previews and rolling pieces.

Prompt: Adapt the white puppy head with charcoal floppy ears, vertical oval eyes and oval nose into wax crayon and colored pencil art matching the game. Center one round head on a transparent background, with ivory hatching, graphite contours and paper tooth. Keep the ears within a circular silhouette so it rolls, legible at small sizes. No mouth, body, accessories, text, photorealism, gloss or shadows.

The renderer clips the sprite to the circular physics fixture and rotates it with the body. Existing material types, sizes and physical properties remain intact; a thin colored rim distinguishes special materials.

# Success sounds

The five MP3 files in `meow/` were supplied by Kiha from Tujo Point's meow collection. Each successful level completion plays one randomly chosen clip through the game's audio mixer.
