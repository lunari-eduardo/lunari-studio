const url = 'https://tlnjspsywycbudhewsfv.supabase.co/rest/v1/conversas_webhook_events?select=event_type,payload,received_at&order=received_at.desc&limit=1000';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsbmpzcHN5d3ljYnVkaGV3c2Z2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQ2NTUwMSwiZXhwIjoyMDczMDQxNTAxfQ.UOOeAcmFWOEwQKj8W10T6AX4S2RTQlW5PhgyEuozjgY';

async function run() {
  const res = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const data = await res.json();
  const unreads = data.filter(d => JSON.stringify(d.payload).includes('unreadMessages'));
  console.log("Unread messages payloads:");
  console.log(JSON.stringify(unreads.slice(0, 5), null, 2));
}

run();
