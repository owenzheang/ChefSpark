# SMARTKITCHEN Technical Design v1

> Historical v1 reference. It records an earlier technical design and does not override
> `PROJECT_CONTEXT.md`, `PROJECT_ROADMAP.md`, or `PROJECT_HANDOVER.md`.

## Authentication

Authentication:
JWT

Password:
bcrypt hashing

Authorization:
JWT middleware

Logout:
Client removes token

### Register

```
POST /api/auth/register
```

Request:

```
{
  "email":"user@gmail.com",
  "password":"123456"
}
```

---

### Login

```
POST /api/auth/login
```

Request:

```
{
  "email":"user@gmail.com",
  "password":"123456"
}
```

---

### Logout

```
POST /api/auth/logout
```

---

# Ingredient APIs

### Get Ingredients

```
GET /api/ingredients
```

Response:

```
[
  {
    "id":1,
    "name":"Eggs",
    "quantity":4,
    "unit":"Pieces"
  }
]
```

---

### Add Ingredient

```
POST /api/ingredients
```

Request:

```
{
  "name":"Eggs",
  "quantity":4,
  "unit":"Pieces"
}
```

---

### Update Ingredient

```
PUT /api/ingredients/:id
```

---

### Delete Ingredient

```
DELETE /api/ingredients/:id
```

---

# Recipe APIs

AI Part:

### Generate Recipes

```
POST /api/recipes/generate
```

Request:

```
{
  "ingredients": [
"Eggs",
"Onion",
"Chicken Wings"
  ],
  "cuisine":"Chinese"
}
```

---

Response:

```
[
  {
    "title":"Soy Sauce Chicken Wings",
    "difficulty":"Easy",
    "cookTime":"20 mins"
  }
]
```

---

### Recipe Detail

```
POST /api/recipes/generate
```

---

### Save Recipe

```
POST /api/saved-recipes
```

---

### Get Saved Recipes

```
GET /api/saved-recipes
```

# MVP Database

Advice:

---

## Users

```
CREATE TABLE users (
    id INTEGER PRIMARYKEY AUTOINCREMENT,
    email TEXTUNIQUENOTNULL,
    password TEXTNOTNULL,
    created_at DATETIMEDEFAULTCURRENT_TIMESTAMP
);
```

---

## Ingredients

```
CREATE TABLE ingredients (
    id INTEGER PRIMARYKEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXTNOTNULL,
    quantity REAL,
    unit TEXT,
    created_at DATETIMEDEFAULTCURRENT_TIMESTAMP,
FOREIGNKEY(user_id)REFERENCES users(id)
);
```

---

## Saved Recipes

Just JSON.

```
CREATE TABLE saved_recipes (
    id INTEGER PRIMARYKEY AUTOINCREMENT,
    user_id INTEGER NOTNULL,
    recipe_json TEXTNOTNULL,
    saved_at DATETIMEDEFAULTCURRENT_TIMESTAMP,
FOREIGNKEY(user_id)REFERENCES users(id)
);
```

---

Example:

recipe_json

```
{
  "title":"Soy Sauce Chicken Wings",
  "difficulty":"Easy",
  "cookTime":"20 mins",
  "ingredients": [
"Chicken Wings",
"Soy Sauce"
  ],
  "steps": [
"Marinate chicken",
"Cook chicken",
"Serve"
  ]
}
```
