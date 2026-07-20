from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import Optional
from data.mock_data import get_all_routes, get_route_detail, get_departures

router = APIRouter()

@router.get("/")
def list_routes():
    return {"routes":get_all_routes(),"count":len(get_all_routes()),
            "timestamp":datetime.now().isoformat()}

@router.get("/{route_id}")
def route_detail(route_id: str):
    detail = get_route_detail(route_id)
    if not detail: raise HTTPException(status_code=404,detail=f"Route {route_id} not found")
    return detail

@router.get("/{route_id}/departures")
def route_departures(route_id: str, hour: Optional[int]=None):
    detail = get_route_detail(route_id)
    if not detail: raise HTTPException(status_code=404,detail=f"Route {route_id} not found")
    return {"route_id":route_id,"route_name":detail["route_name"],
            "departures":get_departures(route_id,hour),"timestamp":datetime.now().isoformat()}

@router.get("/search/departures")
def search_departures(from_stop:Optional[str]=None,to_stop:Optional[str]=None,
                      hour:Optional[int]=None):
    deps = get_departures(None,hour)
    return {"query":{"from":from_stop,"to":to_stop,"hour":hour},
            "results":deps,"count":len(deps),"timestamp":datetime.now().isoformat()}
