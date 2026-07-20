import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../lib/auth';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
} from '@vis.gl/react-google-maps';

const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const MAP_ID = import.meta.env.VITE_GOOGLE_MAP_ID;

const AMMAN_CENTER = {
  lat: 31.9539,
  lng: 35.9106,
};

type BusStatus =
  | 'active'
  | 'delayed'
  | 'maintenance'
  | 'depot'
  | 'full';

interface BusRow {
  id: string;
  route: string;
  driver: string;
  status: BusStatus;
  load: number;
  delay: number;
  speed: number;
}

const BUS_COORDS: Record<
  string,
  { lat: number; lng: number }
> = {
  'BUS-101': { lat: 31.9968, lng: 35.8606 },
  'BUS-102': { lat: 31.995, lng: 35.865 },
  'BUS-103': { lat: 31.9481, lng: 35.8402 },
  'BUS-104': { lat: 31.953, lng: 35.845 },
  'BUS-105': { lat: 31.965, lng: 35.91 },
  'BUS-106': { lat: 31.957, lng: 35.9 },
  'BUS-107': { lat: 32.02, lng: 36.0 },
  'BUS-108': { lat: 31.97, lng: 35.91 },
};

const STATIC_FLEET: BusRow[] = [
  {
    id: 'BUS-104',
    route: 'Alatroon–Mahatta',
    driver: 'Omar K.',
    status: 'active',
    load: 85,
    delay: 0,
    speed: 38,
  },
  {
    id: 'BUS-209',
    route: 'Route 35',
    driver: 'Ahmad S.',
    status: 'delayed',
    load: 100,
    delay: 12,
    speed: 14,
  },
  {
    id: 'BUS-311',
    route: 'Route 12',
    driver: 'Samer A.',
    status: 'active',
    load: 45,
    delay: 2,
    speed: 52,
  },
  {
    id: 'BUS-402',
    route: 'Route 6',
    driver: 'Tariq N.',
    status: 'maintenance',
    load: 0,
    delay: 0,
    speed: 0,
  },
];

function LiveNetworkMap({
  fleet,
  height = '100%',
  zoom = 12,
}: {
  fleet: BusRow[];
  height?: string;
  zoom?: number;
}) {
  const active = fleet.filter(
    (bus) => bus.status !== 'depot'
  );

  return (
    <Map
      mapId={MAP_ID}
      center={AMMAN_CENTER}
      zoom={zoom}
      style={{
        width: '100%',
        height,
        borderRadius: '18px',
      }}
      gestureHandling="greedy"
      disableDefaultUI={false}
    >
      {active.map((bus) => {
        const pos =
          BUS_COORDS[bus.id] ?? AMMAN_CENTER;

        const color =
          bus.status === 'delayed'
            ? '#FF9F43'
            : bus.status === 'full'
            ? '#FF5252'
            : '#00C896';

        return (
          <AdvancedMarker
            key={bus.id}
            position={pos}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div
                style={{
                  background: 'white',
                  padding: '5px 10px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#0F2240',
                  boxShadow:
                    '0 4px 12px rgba(0,0,0,0.15)',
                  border: `2px solid ${color}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {bus.id} • {bus.load}%
              </div>

              <Pin
                background={color}
                borderColor="white"
                glyphColor="white"
              />
            </div>
          </AdvancedMarker>
        );
      })}
    </Map>
  );
}

function FleetCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: 18,
        padding: '1.2rem',
        border: '1px solid #EEF3F8',
        boxShadow:
          '0 4px 14px rgba(15,34,64,.06)',
      }}
    >
      <div
        style={{
          fontSize: '.78rem',
          color: '#7A92A8',
          marginBottom: 10,
          fontWeight: 600,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: '2rem',
          fontWeight: 900,
          color,
          letterSpacing: '-0.04em',
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function OperatorDashboard() {
  const { user, logout } = useAuth();

  const [fleet, setFleet] =
    useState<BusRow[]>(STATIC_FLEET);

  const [clock, setClock] =
    useState<string>('');

  const [refreshing, setRefreshing] =
    useState(false);

  useEffect(() => {
    const tick = () => {
      setClock(
        new Date().toLocaleTimeString('en-GB')
      );
    };

    tick();

    const iv = setInterval(tick, 1000);

    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setFleet((prev) =>
        prev.map((bus) =>
          bus.status === 'active'
            ? {
                ...bus,
                load: Math.min(
                  100,
                  Math.max(
                    10,
                    bus.load +
                      (Math.random() - 0.5) * 8
                  )
                ),
              }
            : bus
        )
      );
    }, 5000);

    return () => clearInterval(iv);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      setRefreshing(true);

      const res = await fetch(
        `${API_URL}/fleet`
      );

      if (res.ok) {
        const data = await res.json();

        if (
          Array.isArray(data.fleet) &&
          data.fleet.length > 0
        ) {
          setFleet(
            data.fleet.map((b: any) => ({
              id: b.vehicle_id,
              route: b.route_id ?? 'Unknown',
              driver: 'On Duty',
              status:
                (b.status as BusStatus) ??
                'active',
              load: b.load_pct ?? 50,
              delay:
                b.delay_minutes ?? 0,
              speed:
                b.speed_kmh ?? 0,
            }))
          );
        }
      }
    } catch (e) {
      console.log(e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <APIProvider
      apiKey={
        import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      }
      libraries={['marker']}
    >
      <div
        style={{
          display: 'flex',
          height: '100vh',
          background: '#F4F8FB',
          overflow: 'hidden',
        }}
      >
        {/* SIDEBAR */}
        <div
          style={{
            width: 240,
            flexShrink: 0,
            background: 'white',
            borderRight:
              '1px solid #EEF3F8',
            display: 'flex',
            flexDirection: 'column',
            boxShadow:
              '2px 0 16px rgba(15,34,64,.06)',
          }}
        >
          {/* LOGO */}
          <div
            style={{
              padding: '1.2rem',
              borderBottom:
                '1px solid #EEF3F8',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: '#E0FBF4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                🚌
              </div>

              <div>
                <div
                  style={{
                    fontSize: '1rem',
                    fontWeight: 900,
                    color: '#0F2240',
                  }}
                >
                  Smart
                  <span
                    style={{
                      color: '#00C896',
                    }}
                  >
                    Transit
                  </span>
                </div>

                <div
                  style={{
                    fontSize: '.65rem',
                    color: '#7A92A8',
                    marginTop: 2,
                  }}
                >
                  Operator Dashboard
                </div>
              </div>
            </div>
          </div>

          {/* USER */}
          <div
            style={{
              margin: '1rem',
              padding: '1rem',
              borderRadius: 16,
              background:
                'linear-gradient(135deg,#0F2240,#1E3A5F)',
              color: 'white',
            }}
          >
            <div
              style={{
                fontSize: '.72rem',
                opacity: 0.7,
                marginBottom: 8,
              }}
            >
              Logged in as
            </div>

            <div
              style={{
                fontSize: '.95rem',
                fontWeight: 700,
              }}
            >
              {user?.name ??
                'Fleet Admin'}
            </div>

            <div
              style={{
                marginTop: 12,
                fontSize: '.75rem',
                opacity: 0.7,
              }}
            >
              🟢 LIVE • {clock}
            </div>
          </div>

          {/* MENU */}
          <div
            style={{
              padding: '0 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {[
              'Dashboard',
              'Fleet',
              'Live Map',
              'Reports',
              'AI Dispatch',
            ].map((item) => (
              <button
                key={item}
                style={{
                  padding: '.9rem 1rem',
                  borderRadius: 12,
                  border: 'none',
                  background:
                    item === 'Dashboard'
                      ? '#E0FBF4'
                      : 'white',
                  color:
                    item === 'Dashboard'
                      ? '#00A87C'
                      : '#4A6580',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {item}
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {/* LOGOUT */}
          <div
            style={{
              padding: '1rem',
            }}
          >
            <button
              onClick={logout}
              style={{
                width: '100%',
                padding: '.9rem',
                borderRadius: 12,
                border: 'none',
                background: '#FFECEC',
                color: '#CC0000',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.4rem',
          }}
        >
          {/* TOP CARDS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(4,1fr)',
              gap: 14,
              marginBottom: 18,
            }}
          >
            <FleetCard
              title="Active Fleet"
              value="104"
              color="#00C896"
            />

            <FleetCard
              title="Live Routes"
              value="27"
              color="#3B9EFF"
            />

            <FleetCard
              title="Peak Hour"
              value="7 PM"
              color="#7C3AED"
            />

            <FleetCard
              title="Boardings"
              value="18,038"
              color="#FF9F43"
            />
          </div>

          {/* MAP */}
          <div
            style={{
              background: 'white',
              borderRadius: 24,
              padding: '1rem',
              border: '1px solid #EEF3F8',
              boxShadow:
                '0 4px 14px rgba(15,34,64,.06)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: '#0F2240',
                  }}
                >
                  Live Fleet Map
                </div>

                <div
                  style={{
                    fontSize: '.75rem',
                    color: '#7A92A8',
                    marginTop: 2,
                  }}
                >
                  Real-time vehicle tracking
                </div>
              </div>

              <button
                onClick={fetchAll}
                style={{
                  padding:
                    '.7rem 1rem',
                  borderRadius: 10,
                  border:
                    '1px solid #EEF3F8',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                {refreshing
                  ? 'Refreshing...'
                  : 'Refresh'}
              </button>
            </div>

            <div
              style={{
                height:
                  'calc(100vh - 250px)',
              }}
            >
              <LiveNetworkMap
                fleet={fleet}
                height="100%"
                zoom={12}
              />
            </div>
          </div>
        </div>
      </div>
    </APIProvider>
  );
}