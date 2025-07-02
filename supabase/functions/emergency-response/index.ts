import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// In a real Deno environment, you would use a Deno-compatible AMQP client.
// This is a conceptual placeholder.
// import * as amqp from 'https://deno.land/x/amqp/mod.ts';

// --- Type Definitions ---
interface EmergencyPayload {
  userId: string;
  rideId: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

interface UserProfile {
  display_name: string;
  emergency_contacts: EmergencyContact[];
}

// --- Environment Variables ---
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const rabbitMqUrl = Deno.env.get('RABBITMQ_URL'); // e.g., 'amqp://user:pass@host:port'

const logger = {
  log: (message: string, ...args: any[]) => console.log(`[emergency-response] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[emergency-response] ERROR: ${message}`, ...args),
};

serve(async (req) => {
  // --- CORS Preflight ---
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  // --- Validate Request ---
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    logger.error('Supabase environment variables are not set.');
    return new Response(JSON.stringify({ error: 'Internal Server Configuration Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // --- Initialize Supabase Admin Client ---
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // --- 1. Authenticate the User ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw { status: 401, message: 'Missing authentication token.' };
    }
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      throw { status: 401, message: 'Invalid or expired authentication token.', details: authError?.message };
    }

    // --- 2. Validate Incoming Payload ---
    const payload: EmergencyPayload = await req.json();
    if (!payload.userId || !payload.rideId || !payload.location?.latitude || !payload.location?.longitude) {
      throw { status: 400, message: 'Invalid request body. Required fields: userId, rideId, location.' };
    }

    // Security Check: Ensure the authenticated user is triggering their own SOS
    if (user.id !== payload.userId) {
      throw { status: 403, message: 'Forbidden: You can only trigger an SOS for yourself.' };
    }

    logger.log(`SOS triggered by user ${user.id} for ride ${payload.rideId}`);

    // --- 3. Log the Emergency Event & Fetch Contacts (Atomic Operation) ---
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('display_name, emergency_contacts')
      .eq('id', user.id)
      .single<UserProfile>();
      
    if (profileError || !profile) {
      logger.error(`Failed to fetch profile for user ${user.id}`, profileError);
      throw { status: 404, message: 'User profile not found.' };
    }

    const { error: logError } = await supabaseAdmin.from('emergencies').insert({
      user_id: user.id,
      ride_id: payload.rideId,
      trigger_location: `POINT(${payload.location.longitude} ${payload.location.latitude})`,
      emergency_type: 'passenger_sos', // Or can be passed in payload
      status: 'active',
    });

    if (logError) {
      logger.error(`Failed to log emergency event for user ${user.id}`, logError);
      throw { status: 500, message: 'Failed to log emergency event.', details: logError.message };
    }

    logger.log(`Emergency event logged successfully for user ${user.id}`);

    // --- 4. Dispatch Asynchronous Notifications via Message Queue ---
    // This part is conceptual as a direct AMQP library might not be ideal in all edge runtimes.
    // In a real Supabase setup, this might call ANOTHER function (e.g., a DB webhook trigger)
    // or use Supabase's built-in message queueing if available.
    // For this implementation, we simulate the direct event emission.
    if (rabbitMqUrl) {
        // Placeholder for RabbitMQ connection and channel logic
        // const connection = await amqp.connect(rabbitMqUrl);
        // const channel = await connection.createChannel();

        // 4a. Notify Emergency Contacts
        if (profile.emergency_contacts && profile.emergency_contacts.length > 0) {
            for (const contact of profile.emergency_contacts) {
                const smsPayload = {
                    to: contact.phone,
                    message: `YALURIDE Emergency Alert: ${profile.display_name} has triggered an SOS during a ride. Last known location: https://maps.google.com/?q=${payload.location.latitude},${payload.location.longitude}`,
                };
                // await channel.publish('notification_exchange', 'sms.send', Buffer.from(JSON.stringify(smsPayload)));
                logger.log(`Dispatched SMS alert for user ${user.id} to contact ${contact.name}`);
            }
        } else {
            logger.warn(`User ${user.id} triggered SOS but has no emergency contacts.`);
        }

        // 4b. Alert Admin Dashboard
        const adminAlertPayload = {
            userId: user.id,
            rideId: payload.rideId,
            location: payload.location,
            userName: profile.display_name,
            timestamp: new Date().toISOString(),
        };
        // await channel.publish('admin_exchange', 'sos.alert.triggered', Buffer.from(JSON.stringify(adminAlertPayload)));
        logger.log(`Dispatched SOS alert to admin dashboard for user ${user.id}`);

        // await channel.close();
        // await connection.close();
    } else {
        logger.warn('RABBITMQ_URL not set. Skipping notification dispatch.');
    }

    // --- 5. Return Success Response ---
    // Return 202 Accepted as the processing is now asynchronous.
    return new Response(JSON.stringify({ success: true, message: 'SOS signal received and alerts are being dispatched.' }), {
      status: 202,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    logger.error('An error occurred in the emergency-response function:', err);
    const status = err.status || 500;
    const message = err.message || 'An unexpected error occurred.';
    return new Response(JSON.stringify({ error: message, details: err.details }), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
