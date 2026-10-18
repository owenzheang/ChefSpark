# SMARTKITCHEN Workflow v1

> Historical v1 reference. It records an earlier product concept and does not override
> `PROJECT_CONTEXT.md`, `PROJECT_ROADMAP.md`, or `PROJECT_HANDOVER.md`.

---

# 1. User Journey

## User Type

Primary Users:

- International students
- People living alone
- Beginner cooks
- People who don't know what to cook
- People who want to reduce food waste

---

## User Scenario

### Scenario 1: I don't know what to cook

```
User opens SMARTKITCHEN
↓
User checks available ingredients
↓
User selects preferred cuisine
↓
User clicks Generate Recipes
↓
SMARTKITCHEN recommends recipes
↓
User selects one recipe
↓
User follows cooking instructions
↓
User finishes cooking
```

---

### Scenario 2: I have ingredients that will expire soon

```
User opens SMARTKITCHEN
↓
SMARTKITCHEN detects ingredients close to expiry
↓
SMARTKITCHEN recommends recipes using those ingredients
↓
User selects recipe
↓
User cooks meal
```

(V2 Feature)

---

### Scenario 3: I see food but don't know what it is

```
User takes photo
↓
AI identifies food
↓
AI provides information
↓
User saves ingredient
```

(V2 Feature)

---

# 2. MVP Scope

## MVP Goal

Help users decide what to cook using ingredients they already have.

---

## Included in MVP

### User Account

- Register
- Login
- Logout

---

### Ingredient Management

- Add ingredient
- Edit ingredient
- Delete ingredient
- View ingredient list

---

### Cuisine Selection

- Chinese
- Western

---

### Recipe Recommendation

User enters ingredients.

SMARTKITCHEN generates:

- Recipe name
- Cooking time
- Difficulty
- Missing ingredients

---

### Recipe Detail

Display:

- Ingredients
- Cooking steps
- Cooking time
- Difficulty

---

## Not Included in MVP

Move to Future Versions:

- Food photo recognition
- Expiry date recognition
- Calorie calculation
- Cost calculation
- Community page
- AI chatbot
- Shopping list
- Meal planning

---

# 3. Database Design

## User

```
User
-----
id
email
password
created_at
```

---

## Ingredient

```
Ingredient
-----
id
user_id
name
quantity
unit
created_at
```

Example:

```
Eggs
4
Pieces
```

---



## SavedRecipe

```
SavedRecipe
-----
id
user_id
saved_at
```

---

# 4. Application Workflow

## Login Flow

```
Login
↓
Dashboard
```

---

## Recipe Generation Flow

```
Dashboard
↓
View Ingredients
↓
Select Cuisine
↓
Generate Recipes
↓
Recipe List
↓
Recipe Detail
```

---

## Ingredient Management Flow

```
Dashboard
↓
Ingredient Page
↓
Add/Edit/Delete Ingredient
↓
Save Changes
↓
Return Dashboard
```

---

# AI Recipe Recommendation Flow

Input:

Ingredients:

- Eggs
- Onion
- Chicken Wings

Cuisine:

- Chinese

Output:

Recipe Name
Cooking Time
Difficulty
Missing Ingredients
Cooking Steps

# 5. Wireframes

## Login Page

```
--------------------------------
SMARTKITCHEN
--------------------------------

Email

[____________]

Password

[____________]

[ Login ]

[ Register ]
```

---

## Dashboard

```
--------------------------------
SMARTKITCHEN
--------------------------------

My Ingredients

Eggs
Onion
Chicken Wings

[ Add Ingredient ]

--------------------------------

Cuisine

( ) Chinese
( ) Western

--------------------------------

[ Generate Recipes ]
```

---

## Recipe Result Page

```
--------------------------------
Recommended Recipes
--------------------------------

1. Soy Sauce Chicken Wings

Time: 20 min
Difficulty: Easy
[Picture]

--------------------------------

2. Onion Omelette

Time: 10 min
Difficulty: Easy
[Picture]

--------------------------------

3. Stir-fried Chicken Onion

Time: 15 min
Difficulty: Medium
[Picture]
```

---

## Recipe Detail Page

```
--------------------------------
Soy Sauce Chicken Wings
--------------------------------
[Picture]
Time: 20 min

Difficulty: Easy

Ingredients

- Chicken Wings
- Soy Sauce

Steps

1. Prepare ingredients
2. Marinate chicken
3. Cook chicken
4. Serve

[ Save Recipe ]
```

---

# 6. Success Metrics

## Week 1

- 5 users test the system

---

## Week 2

- 10 users test the system

---

## MVP Success Criteria

- 10+ users
- 5 users return the next day
- 3 users use it for 7 days

# 7. Feature Roadmap

## MVP (Version 1)

- Register/Login
- Ingredient Management
- Cuisine Selection
- Recipe Recommendation
- Recipe Detail
- Save Recipe

## Version 2

- Food Recognition
- Expiry Date Recognition
- Shopping List
- Calories

## Version 3

- Community
- AI Chatbot
- Meal Planning
