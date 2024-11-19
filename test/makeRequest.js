export const makeRequest = async function ({
  url,
  body = {},
  method = 'POST',
  headers = {},
}) {
  const bodyString = JSON.stringify(body);
  let json;

  const response = await fetch(url, {
    method,
    body: bodyString,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      ...headers,
    },
  })
  if (!response.ok) {
    let message = `Failed api request to ${url}`
    try {
      const responseText = await response.text()
      if (responseText) {
        message += responseText
      }
    } catch (e) {
      throw new Error(`Api request to ${url}: ${message} ${response.status}`)
    }
  }
  try {
    // incase the the server returns invalid json
    json = await response.json()
  } catch (e) {
    return ''
  }
  return json
}
