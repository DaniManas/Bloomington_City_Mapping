import os
import json
import pandas as pd
from shapely.geometry import shape, Point
from flask import Flask, render_template, jsonify, Response
from flask_cors import CORS

# ───────────────────────────────────────────────────────────────────────────
# 1) Create Flask app
# ───────────────────────────────────────────────────────────────────────────
app = Flask(
    __name__,
    static_folder="static",
    template_folder="templates"
)
CORS(app)

# ───────────────────────────────────────────────────────────────────────────
# 2) Load facilities.csv
# ───────────────────────────────────────────────────────────────────────────
data = pd.read_csv(os.path.join("data", "facilities.csv"))

# ───────────────────────────────────────────────────────────────────────────
# 3) Prepare path to your static GeoJSON
# ───────────────────────────────────────────────────────────────────────────
GEOJSON_PATH = os.path.join(app.root_path, "static", "bloomington-districts.geojson")

# ───────────────────────────────────────────────────────────────────────────
# 4) Mount your Dash app
# ───────────────────────────────────────────────────────────────────────────
import dash_app  # dash_app.py must import `app` and register itself at /dash/

# ───────────────────────────────────────────────────────────────────────────
# 5) Flask routes & APIs
# ───────────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/facilities")
def get_facilities():
    return jsonify(data.to_dict(orient="records"))


@app.route("/api/facility_types")
def facility_types():
    types = sorted(data["Facility_Type"].dropna().unique())
    return jsonify(types)


@app.route("/api/facilities_by_type")
def facilities_by_type():
    grouped = (
        data["Facility_Type"]
        .value_counts()
        .reset_index()
        .rename(columns={"index": "type", "Facility_Type": "count"})
    )
    return jsonify(grouped.to_dict(orient="records"))


@app.route("/api/districts")
def get_districts():
    """
    Loads the raw district GeoJSON, dynamically counts how many facilities
    fall inside each district polygon, and injects that count as 'facility_count'.
    """
    with open(GEOJSON_PATH, "r") as f:
        gj = json.load(f)

    # Prepare Shapely Points for facilities
    points = [
        Point(row["Longitude"], row["Latitude"])
        for idx, row in data.dropna(subset=["Longitude", "Latitude"]).iterrows()
    ]

    # For each district feature, count how many points it contains
    for feature in gj["features"]:
        polygon = shape(feature["geometry"])
        count = sum(polygon.contains(pt) for pt in points)
        feature.setdefault("properties", {})["facility_count"] = count

    return jsonify(gj)


# ───────────────────────────────────────────────────────────────────────────
# 6) Run the app
# ───────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True)
