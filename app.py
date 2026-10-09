"""Flask API + web UI for the Indore house price (Linear Regression) model."""
import os
import pickle
import warnings

import pandas as pd
from flask import Flask, jsonify, render_template, request

warnings.filterwarnings("ignore")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "LinearRegModel.pkl")

app = Flask(__name__)


def load_model():
    try:
        with open(MODEL_PATH, "rb") as f:
            return pickle.load(f)
    except AttributeError:
        # Model was saved with scikit-learn 1.6.1; newer versions renamed an
        # internal class. Best fix: `pip install scikit-learn==1.6.1`.
        import sklearn.compose._column_transformer as ct

        class _RemainderColsList(list):
            def __setstate__(self, state):
                if isinstance(state, dict):
                    self.__dict__.update(state)

        ct._RemainderColsList = _RemainderColsList
        with open(MODEL_PATH, "rb") as f:
            return pickle.load(f)


model = load_model()
preprocessor = model.named_steps["preprocessor"]
cat_enc = preprocessor.named_transformers_["cat"]
LOCALITIES, PROPERTY_TYPES, FURNISHINGS = [list(map(str, c)) for c in cat_enc.categories_]

FEATURE_ORDER = list(preprocessor.feature_names_in_)

# name -> (label, min, max, cast)
NUMERIC_RULES = {
    "BHK": (1, 10, int),
    "Area_sqft": (100, 20000, float),
    "Bathrooms": (1, 10, int),
    "Age_Years": (0, 100, float),
    "Parking": (0, 10, int),
    "Road_Width_ft": (5, 200, float),
    "Distance_Main_Road_km": (0, 50, float),
    "Floor": (0, 100, int),
}


def validate(payload):
    """Return (clean_row_dict, errors_dict)."""
    clean, errors = {}, {}
    for name, options in (
        ("Locality", LOCALITIES),
        ("Property_Type", PROPERTY_TYPES),
        ("Furnishing", FURNISHINGS),
    ):
        val = payload.get(name)
        if val not in options:
            errors[name] = f"Choose a valid {name.replace('_', ' ').lower()}."
        else:
            clean[name] = val
    for name, (lo, hi, cast) in NUMERIC_RULES.items():
        raw = payload.get(name)
        try:
            num = cast(float(raw)) if cast is int else float(raw)
            if cast is int and float(raw) != num:
                raise ValueError
        except (TypeError, ValueError):
            errors[name] = "Enter a valid number." if cast is float else "Enter a whole number."
            continue
        if not lo <= num <= hi:
            errors[name] = f"Must be between {lo} and {hi}."
        else:
            clean[name] = num
    return clean, errors


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/options")
def options():
    return jsonify(
        localities=LOCALITIES,
        property_types=PROPERTY_TYPES,
        furnishings=FURNISHINGS,
        limits={k: {"min": v[0], "max": v[1]} for k, v in NUMERIC_RULES.items()},
    )


@app.route("/api/health")
def health():
    return jsonify(status="ok")


@app.route("/api/predict", methods=["POST"])
def predict():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify(error="Send a JSON body."), 400
    clean, errors = validate(payload)
    if errors:
        return jsonify(error="Please fix the highlighted fields.", fields=errors), 422
    df = pd.DataFrame([clean])[FEATURE_ORDER]
    price = float(model.predict(df)[0])
    if price <= 0:
        return (
            jsonify(
                error="These inputs fall outside the range the model was trained on. "
                "Try more typical values."
            ),
            422,
        )
    return jsonify(
        price_lakh=round(price, 2),
        price_per_sqft=round(price * 100000 / clean["Area_sqft"]),
        inputs=clean,
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
