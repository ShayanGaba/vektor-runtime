// export default {
//   async fetch(request, env, ctx) {
//     // Debug: check if secret exists
//     const hasKey = !!env.GROQ_API_KEY;
//     const keyLength = env.GROQ_API_KEY ? env.GROQ_API_KEY.length : 0;
    
//     console.log('Secret exists:', hasKey);
//     console.log('Key length:', keyLength);

//     if (request.method === 'OPTIONS') {
//       return new Response(null, {
//         status: 204,
//         headers: {
//           'Access-Control-Allow-Origin': '*',
//           'Access-Control-Allow-Methods': 'POST, OPTIONS',
//           'Access-Control-Allow-Headers': 'Content-Type, Authorization'
//         }
//       });
//     }

//     if (request.method !== 'POST') {
//       return new Response('Method not allowed', { 
//         status: 405,
//         headers: { 'Access-Control-Allow-Origin': '*' }
//       });
//     }

//     // Check if key is missing
//     if (!env.GROQ_API_KEY) {
//       return new Response(JSON.stringify({
//         error: 'GROQ_API_KEY secret not found in worker environment'
//       }), {
//         status: 500,
//         headers: {
//           'Content-Type': 'application/json',
//           'Access-Control-Allow-Origin': '*'
//         }
//       });
//     }

//     const body = await request.json();

//     const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${env.GROQ_API_KEY}`,
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify(body)
//     });

//     const responseBody = await groqResponse.text();
//     return new Response(responseBody, {
//       status: groqResponse.status,
//       headers: {
//         'Content-Type': 'application/json',
//         'Access-Control-Allow-Origin': '*',
//         'Access-Control-Allow-Methods': 'POST, OPTIONS',
//         'Access-Control-Allow-Headers': 'Content-Type, Authorization'
//       }
//     });
//   }
// };







export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        }
      });
    }

    // Check if key exists
    if (!env.GROQ_API_KEY) {
      return new Response(JSON.stringify({
        error: 'GROQ_API_KEY secret not found'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const body = await request.json();

    // Forward to Groq with streaming enabled
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...body,
        stream: true  // Force streaming
      })
    });

    // Stream the response directly — NO buffering
    return new Response(groqResponse.body, {
      status: groqResponse.status,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',  // Stream as text
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no'  // Disable nginx buffering
      }
    });
  }
};