# dash_app.py

import pandas as pd
from dash import Dash, html, dcc, Input, Output
import plotly.express as px

# import your Flask app
from app import app

# ───────────────────────────────────────────────────────────────────────
# Load & clean your data
# ───────────────────────────────────────────────────────────────────────
df = pd.read_csv("data/facilities.csv")

# Drop any truly duplicated column names (keeps the first occurrence)
df = df.loc[:, ~df.columns.duplicated()]

# ───────────────────────────────────────────────────────────────────────
# Prepare figures for the Planner tab
# ───────────────────────────────────────────────────────────────────────

# 1) Density heatmap of all facilities
density_fig = px.density_mapbox(
    df,
    lat="Latitude",
    lon="Longitude",
    radius=15,
    zoom=11,
    mapbox_style="carto-positron",
    title="Facility Density Heatmap"
)

# 2) Bar chart of facility counts by type, renamed to avoid “count” collisions
bar_df = (
    df["Facility_Type"]
      .value_counts()
      .reset_index()
)
bar_df.columns = ["type", "facility_count"]
bar_fig = px.bar(
    bar_df,
    x="type",
    y="facility_count",
    title="Facilities by Type",
    labels={"type": "Facility Type", "facility_count": "Number of Facilities"}
)

# ───────────────────────────────────────────────────────────────────────
# Mount Dash on Flask under /dash/
# ───────────────────────────────────────────────────────────────────────
dash_app = Dash(
    __name__,
    server=app,
    url_base_pathname="/dash/",
    external_stylesheets=["/static/style.css"]
)

dash_app.layout = html.Div(className="p-6 bg-gray-50 min-h-screen", children=[
    html.H1("Bloomington Facility Dashboard", className="text-4xl font-bold mb-6 text-center"),
    dcc.Tabs([
        dcc.Tab(label="Resident View", children=[
            html.Div(className="max-w-md mx-auto mb-4", children=[
                dcc.Dropdown(
                    id="type-filter",
                    options=[{"label": t, "value": t} for t in sorted(df["Facility_Type"].unique())],
                    placeholder="Filter by facility type",
                    clearable=True,
                    className="border rounded p-2"
                )
            ]),
            dcc.Graph(id="resident-map")
        ]),
        dcc.Tab(label="Planner View", children=[
            html.Div(className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6", children=[
                dcc.Graph(figure=density_fig, className="shadow rounded bg-white p-4"),
                dcc.Graph(figure=bar_fig,    className="shadow rounded bg-white p-4")
            ])
        ])
    ])
])

# ───────────────────────────────────────────────────────────────────────
# Callback for Resident map
# ───────────────────────────────────────────────────────────────────────
@dash_app.callback(
    Output("resident-map", "figure"),
    Input("type-filter", "value")
)
def update_resident_map(selected_type):
    dff = df if not selected_type else df[df["Facility_Type"] == selected_type]
    fig = px.scatter_mapbox(
        dff,
        lat="Latitude",
        lon="Longitude",
        hover_name="Facility_Name",
        zoom=12,
        height=600,
        mapbox_style="carto-positron"
    )
    fig.update_layout(margin={"r":0,"t":0,"l":0,"b":0})
    return fig
