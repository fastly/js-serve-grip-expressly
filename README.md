# js-serve-grip-expressly

Use js-serve-grip on Expressly.

## Usage

The following example posts to a Pushpin publisher at `http://localhost:5561/publish/`.
Make sure you have set up a Backend on your service that can be accessed through that host name.

```javascript
import { Router } from "@fastly/expressly";
import { ServeGrip } from "@fastly/serve-grip-expressly";

const serveGrip = new ServeGrip({
  grip: {
    control_uri: 'http://localhost:5561/',
    backend: 'grip-publisher',
  }
});

const router = new Router();
router.use(serveGrip);

router.get('/api/stream', async(req, res) => {
  if (req.grip.isProxied) {
    const gripInstruct = res.grip.startInstruct();
    gripInstruct.addChannel('test');
    gripInstruct.setHoldStream();
    res.setHeader('Content-Type', 'text/plain');
    res.end('[stream open]\n');
  } else {
    res.setHeader('Content-Type', 'text/plain');
    res.end("[not proxied]\n");
  }
});

router.get('/api/publish', async(req, res) => {
  const msg = req.url.searchParams.get('msg') ?? 'test message';
  try {
    const publisher = serveGrip.getPublisher()
    await publisher.publishHttpStream('test', msg + '\n');
    res.setHeader('Content-Type', 'text/plain');
    res.end('Publish successful!');
  } catch({message, context}) {
    res.withStatus(500);
    res.setHeader('Content-Type', 'text/plain');
    res.end('Publish failed!\n' + message + '\n' + JSON.stringify(context, null, 2) + '\n');
  }
});

router.listen();
```

## WS-over-HTTP

The following examples uses WS-over-HTTP. Make sure Pushpin uses the `over_http` settting.

```javascript
import { Router } from "@fastly/expressly";
import { ServeGrip } from "@fastly/serve-grip-expressly";
import { WebSocketMessageFormat } from "@fanoutio/grip";

const serveGrip = new ServeGrip({
  grip: {
    control_uri: 'http://localhost:5561/',
    backend: 'grip-publisher',
  }
});

const router = new Router();
router.use(serveGrip);

// Websocket-over-HTTP is translated to HTTP POST
router.post('/api/websocket', async (req, res) => {
  // Grip signature and connection id are checked by serve-grip
  // Incoming events are decoded, and a WsContent is created as well.
  const { wsContext } = req.grip;
  if (wsContext == null) {
    res.withStatus(400);
    res.setHeader('Content-Type', 'text/plain');
    res.end('[not a websocket request]\n');
    return;
  }

  // If this is a new connection, accept it and subscribe it to a channel
  if (wsContext.isOpening()) {
    wsContext.accept();
    wsContext.subscribe('test-ws');
  }

  // Headers and outgoing events are sent by serve-grip
  res.end('');
});

router.post('/api/broadcast', async (req: GripExpresslyRequest, res: GripExpresslyResponse) => {
  const publisher = serveGrip.getPublisher();
  await publisher.publishFormats('test-ws', new WebSocketMessageFormat(await req.text()));
  res.setHeader('Content-Type', 'text/plain');
  res.end('Ok\n');
});

router.listen();
```
