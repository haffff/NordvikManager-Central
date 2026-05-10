'use strict';

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'NordvikManager Central Server',
    version: '1.0.0',
    description:
      'Central authentication, game session management, and WebRTC signaling server.\n\n' +
      '**Auth:** Login via `POST /api/user/login` — the server sets an `Authorization` HttpOnly cookie automatically. ' +
      'All protected endpoints read that cookie. Use the **Authorize** button below to set it for Swagger requests.',
  },
  servers: [{ url: '/', description: 'This server' }],

  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'Authorization',
        description: 'JWT access token set automatically on login',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
      ValidationErrors: {
        type: 'object',
        properties: {
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                msg: { type: 'string' },
                path: { type: 'string' },
                location: { type: 'string' },
              },
            },
          },
        },
      },
      UserInfo: {
        type: 'object',
        properties: {
          admin: { type: 'boolean' },
          userName: { type: 'string' },
          email: { type: 'string', nullable: true },
        },
      },
      UserListItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userName: { type: 'string' },
          email: { type: 'string', nullable: true },
          admin: { type: 'boolean' },
          nickname: { type: 'string', nullable: true },
          avatarUrl: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PaginatedUsers: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/UserListItem' } },
          page: { type: 'integer' },
          total: { type: 'integer' },
          count: { type: 'integer' },
        },
      },
      InviteItem: {
        type: 'object',
        properties: {
          key: { type: 'string', format: 'uuid' },
          created_by: { type: 'string', format: 'uuid' },
          expires_at: { type: 'string', format: 'date-time' },
          used: { type: 'integer', enum: [0, 1] },
        },
      },
      PaginatedInvites: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/InviteItem' } },
          page: { type: 'integer' },
          total: { type: 'integer' },
          count: { type: 'integer' },
        },
      },
      GameSession: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          summary: { type: 'string', nullable: true },
          description: { type: 'string', nullable: true },
          imageData: { type: 'string', nullable: true, description: 'Base64 image' },
          passwordRequired: { type: 'boolean' },
          isPublic: { type: 'boolean' },
          ownerId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PaginatedGameSessions: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/GameSession' } },
          page: { type: 'integer' },
          total: { type: 'integer' },
          count: { type: 'integer' },
        },
      },
      SignalingPeer: {
        type: 'object',
        properties: {
          socketId: { type: 'string' },
          userId: { type: 'string', format: 'uuid' },
          username: { type: 'string' },
          role: { type: 'string', enum: ['gm', 'player'] },
        },
      },
      SignalingSession: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', format: 'uuid' },
          peers: { type: 'array', items: { $ref: '#/components/schemas/SignalingPeer' } },
        },
      },
    },
  },

  security: [{ cookieAuth: [] }],

  tags: [
    { name: 'Auth', description: 'Login, logout, token refresh' },
    { name: 'Users', description: 'User account management (admin only where noted)' },
    { name: 'Invites', description: 'Invite code management (admin only)' },
    { name: 'Game Sessions', description: 'Game session management' },
    { name: 'WebRTC', description: 'Active signaling session info (Socket.io handles actual signaling)' },
  ],

  paths: {
    // ── AUTH ───────────────────────────────────────────────────────────
    '/api/user/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        description: 'Validates credentials and sets the `Authorization` HttpOnly cookie.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['UserName', 'password'],
                properties: {
                  UserName: { type: 'string', example: 'admin' },
                  password: { type: 'string', format: 'password', example: 'secret' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful — cookie set, refresh token returned',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { refreshToken: { type: 'string', format: 'uuid' } },
                },
              },
            },
          },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          429: { description: 'Rate limit exceeded' },
        },
      },
    },

    '/api/user/checklogin': {
      get: {
        tags: ['Auth'],
        summary: 'Check login',
        description: 'Returns 200 if the JWT cookie is valid.',
        responses: {
          200: { description: 'Authenticated' },
          401: { description: 'Not authenticated' },
        },
      },
    },

    '/api/user/logout': {
      get: {
        tags: ['Auth'],
        summary: 'Logout',
        description: 'Clears the cookie and revokes all refresh tokens for the current user.',
        responses: {
          200: { description: 'Logged out' },
          401: { description: 'Not authenticated' },
        },
      },
    },

    '/api/user/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        description: 'Exchanges a refresh token for a new access token (cookie) and a new refresh token.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: { refreshToken: { type: 'string', format: 'uuid' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'New tokens issued',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { refreshToken: { type: 'string', format: 'uuid' } },
                },
              },
            },
          },
          401: { description: 'Invalid or expired refresh token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ── USERS ──────────────────────────────────────────────────────────
    '/api/user/userinfo': {
      get: {
        tags: ['Users'],
        summary: 'Get current user info',
        responses: {
          200: { description: 'User info', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserInfo' } } } },
          401: { description: 'Not authenticated' },
          404: { description: 'User not found' },
        },
      },
    },

    '/api/user/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register with invite code',
        description: 'Creates a new player account. Requires a valid invite code.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['UserName', 'password', 'confirmPassword', 'inviteCode'],
                properties: {
                  UserName: { type: 'string', pattern: '^[a-zA-Z0-9_]+$', maxLength: 100 },
                  password: { type: 'string', format: 'password', minLength: 6 },
                  confirmPassword: { type: 'string', format: 'password' },
                  email: { type: 'string', format: 'email' },
                  inviteCode: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Registered — cookie set, refresh token returned',
            content: { 'application/json': { schema: { type: 'object', properties: { refreshToken: { type: 'string' } } } } },
          },
          400: { description: 'Validation error or invalid invite', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Username already taken' },
          429: { description: 'Rate limit exceeded' },
        },
      },
    },

    '/api/user/CheckRegistrationKey': {
      get: {
        tags: ['Auth'],
        summary: 'Validate invite code',
        security: [],
        parameters: [{ name: 'key', in: 'query', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Invite is valid' },
          400: { description: 'Invalid or expired invite' },
        },
      },
    },

    '/api/user/users': {
      get: {
        tags: ['Users'],
        summary: 'List all users (admin)',
        parameters: [{ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }],
        responses: {
          200: { description: 'Paginated user list', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedUsers' } } } },
          401: { description: 'Not authenticated' },
          403: { description: 'Admin required' },
        },
      },
    },

    '/api/user/deleteuser': {
      delete: {
        tags: ['Users'],
        summary: 'Delete a user (admin)',
        parameters: [{ name: 'userID', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Deleted' },
          400: { description: 'Cannot delete own account' },
          401: { description: 'Not authenticated' },
          403: { description: 'Admin required' },
          404: { description: 'User not found' },
        },
      },
    },

    '/api/user/createuser': {
      post: {
        tags: ['Users'],
        summary: 'Create a user directly (admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userName', 'password'],
                properties: {
                  userName: { type: 'string', pattern: '^[a-zA-Z0-9_]+$' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password', minLength: 6 },
                  isAdmin: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User created', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } } } } },
          401: { description: 'Not authenticated' },
          403: { description: 'Admin required' },
          409: { description: 'Username already taken' },
        },
      },
    },

    '/api/user/resetpassword': {
      post: {
        tags: ['Users'],
        summary: 'Reset a user password (admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userID', 'newPassword'],
                properties: {
                  userID: { type: 'string', format: 'uuid' },
                  newPassword: { type: 'string', format: 'password', minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password updated, all refresh tokens revoked' },
          401: { description: 'Not authenticated' },
          403: { description: 'Admin required' },
          404: { description: 'User not found' },
        },
      },
    },

    '/api/user/toggleadmin': {
      post: {
        tags: ['Users'],
        summary: 'Set admin status for a user (admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userID', 'isAdmin'],
                properties: {
                  userID: { type: 'string', format: 'uuid' },
                  isAdmin: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated' },
          400: { description: 'Cannot change own admin status' },
          401: { description: 'Not authenticated' },
          403: { description: 'Admin required' },
          404: { description: 'User not found' },
        },
      },
    },

    '/api/user/GetUserNameById': {
      get: {
        tags: ['Users'],
        summary: 'Get username by user ID',
        parameters: [{ name: 'id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Username', content: { 'application/json': { schema: { type: 'object', properties: { userName: { type: 'string' } } } } } },
          401: { description: 'Not authenticated' },
          404: { description: 'User not found' },
        },
      },
    },

    '/api/user/KeyboardBindings': {
      get: {
        tags: ['Users'],
        summary: 'Get key bindings for current user',
        responses: {
          200: { description: 'Key bindings object', content: { 'application/json': { schema: { type: 'object', additionalProperties: { type: 'string' } } } } },
          401: { description: 'Not authenticated' },
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Save key bindings for current user',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', additionalProperties: { type: 'string' } } } },
        },
        responses: {
          200: { description: 'Saved' },
          401: { description: 'Not authenticated' },
        },
      },
    },

    // ── INVITES ────────────────────────────────────────────────────────
    '/api/user/GenerateInvite': {
      get: {
        tags: ['Invites'],
        summary: 'Generate an invite code (admin)',
        parameters: [
          { name: 'hours', in: 'query', description: 'Validity in hours (1–720, default 24)', schema: { type: 'integer', default: 24 } },
        ],
        responses: {
          200: { description: 'Invite key', content: { 'application/json': { schema: { type: 'object', properties: { key: { type: 'string', format: 'uuid' } } } } } },
          401: { description: 'Not authenticated' },
          403: { description: 'Admin required' },
        },
      },
    },

    '/api/user/invites': {
      get: {
        tags: ['Invites'],
        summary: 'List invite codes (admin)',
        parameters: [{ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }],
        responses: {
          200: { description: 'Paginated invites', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedInvites' } } } },
          401: { description: 'Not authenticated' },
          403: { description: 'Admin required' },
        },
      },
    },

    '/api/user/deleteinvite': {
      delete: {
        tags: ['Invites'],
        summary: 'Delete an invite code (admin)',
        parameters: [{ name: 'key', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Deleted' },
          401: { description: 'Not authenticated' },
          403: { description: 'Admin required' },
          404: { description: 'Invite not found' },
        },
      },
    },

    // ── GAME SESSIONS ──────────────────────────────────────────────────
    '/api/gamelist/getgames': {
      get: {
        tags: ['Game Sessions'],
        summary: 'List game sessions for current user',
        description: 'Returns sessions the user owns or has joined.',
        responses: {
          200: { description: 'Session list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/GameSession' } } } } },
          401: { description: 'Not authenticated' },
        },
      },
    },

    '/api/gamelist/addgame': {
      post: {
        tags: ['Game Sessions'],
        summary: 'Create a game session',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', maxLength: 200 },
                  summary: { type: 'string', maxLength: 500 },
                  description: { type: 'string', maxLength: 5000 },
                  image: { type: 'string', description: 'Base64 image data' },
                  passwordRequired: { type: 'boolean', default: false },
                  password: { type: 'string', format: 'password' },
                  isPublic: { type: 'boolean', default: false, description: 'List this session in the public game browser. Requires ALLOW_PUBLIC_GAMES to be enabled on the server.' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Session created', content: { 'application/json': { schema: { $ref: '#/components/schemas/GameSession' } } } },
          400: { description: 'Validation error' },
          401: { description: 'Not authenticated' },
          403: { description: 'Public games are not allowed on this server' },
        },
      },
    },

    '/api/gamelist/publicgames': {
      get: {
        tags: ['Game Sessions'],
        summary: 'Browse public game sessions',
        description:
          'Returns paginated public sessions that have an active GM WebRTC channel. ' +
          'Each candidate is verified with a live ping to the GM backend before being included. ' +
          'Only available when `ALLOW_PUBLIC_GAMES=true` on the server (sessions can still be fetched even if the flag was later disabled).',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 }, description: 'Page number' },
          { name: 'count', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 }, description: 'Results per page' },
        ],
        responses: {
          200: { description: 'Paginated public sessions', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedGameSessions' } } } },
          401: { description: 'Not authenticated' },
        },
      },
    },

    '/api/gamelist/join': {
      post: {
        tags: ['Game Sessions'],
        summary: 'Join a game session',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['gameID'],
                properties: {
                  gameID: { type: 'string', format: 'uuid' },
                  password: { type: 'string', format: 'password', description: 'Required if session is password-protected' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Joined' },
          400: { description: 'Already owner or password missing' },
          401: { description: 'Not authenticated or wrong password' },
          404: { description: 'Session not found' },
          409: { description: 'Already joined' },
        },
      },
    },

    '/api/gamelist/DeleteGame': {
      delete: {
        tags: ['Game Sessions'],
        summary: 'Delete a game session',
        description: 'Owner or admin only.',
        parameters: [{ name: 'gameId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Deleted' },
          401: { description: 'Not authenticated' },
          403: { description: 'Not the owner' },
          404: { description: 'Session not found' },
        },
      },
    },

    '/api/gamelist/GetFeaturedAddons': {
      get: {
        tags: ['Game Sessions'],
        summary: 'Get featured addons list',
        responses: {
          200: { description: 'Array of featured addons', content: { 'application/json': { schema: { type: 'array', items: {} } } } },
          401: { description: 'Not authenticated' },
        },
      },
    },

    '/api/gamelist/versioninfo': {
      get: {
        tags: ['Game Sessions'],
        summary: 'Get version info',
        responses: {
          200: {
            description: 'Version info',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    isUpdateAvailable: { type: 'boolean' },
                    currentVersion: { type: 'string' },
                    latestVersion: { type: 'string' },
                  },
                },
              },
            },
          },
          401: { description: 'Not authenticated' },
        },
      },
    },

    // ── WEBRTC ─────────────────────────────────────────────────────────
    '/webrtc/sessions': {
      get: {
        tags: ['WebRTC'],
        summary: 'List active signaling sessions',
        description: 'Returns in-memory state of all currently connected WebRTC sessions.',
        responses: {
          200: {
            description: 'Active sessions',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/SignalingSession' } } } },
          },
          401: { description: 'Not authenticated' },
        },
      },
    },

    '/webrtc/sessions/{sessionId}/peers': {
      get: {
        tags: ['WebRTC'],
        summary: 'List peers in a signaling session',
        parameters: [{ name: 'sessionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: {
            description: 'Connected peers',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/SignalingPeer' } } } },
          },
          401: { description: 'Not authenticated' },
          404: { description: 'No active signaling session found' },
        },
      },
    },
  },
};

module.exports = spec;
