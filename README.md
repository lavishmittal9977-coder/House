# Indore House Price Predictor

Flask API + HTML/CSS/JavaScript frontend for the scikit-learn `LinearRegModel.pkl` pipeline.

## Run
```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
Open http://127.0.0.1:5000

> The model was saved with **scikit-learn 1.6.1**, which `requirements.txt` pins.
> Other versions may fail to load the pickle or give warnings.

## API
| Method | Route          | Purpose                                   |
|--------|----------------|-------------------------------------------|
| GET    | `/`            | Web UI                                    |
| GET    | `/api/options` | Dropdown values and numeric limits        |
| POST   | `/api/predict` | JSON in -> `{price_lakh, price_per_sqft}` |
| GET    | `/api/health`  | Health check                              |

Example:
```bash
curl -X POST http://127.0.0.1:5000/api/predict -H "Content-Type: application/json" -d '{
 "Locality":"Vijay Nagar","Property_Type":"Apartment","BHK":2,"Area_sqft":1000,
 "Bathrooms":2,"Age_Years":5,"Parking":1,"Road_Width_ft":30,
 "Distance_Main_Road_km":1,"Floor":2,"Furnishing":"Semi-Furnished"}'
```

## Structure
```
app.py  LinearRegModel.pkl  requirements.txt
templates/index.html
static/css/style.css  static/js/script.js
```
