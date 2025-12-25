const SYNDICATION_URL = 'https://cdn.syndication.twimg.com';

class TwitterApiError extends Error {
  constructor({ message, status, data }) {
    super(message);
    this.name = 'TwitterApiError';
    this.status = status;
    this.data = data;
  }
}

const TWEET_ID = /^[0-9]+$/;

function getToken(id) {
  return ((Number(id) / 1e15) * Math.PI).toString(6 ** 2).replace(/(0+|\\.)/g, '');
}

/**
 * Fetches a tweet from the Twitter syndication API.
 */
async function fetchTweet(id, fetchOptions = {}) {
  if (id.length > 40 || !TWEET_ID.test(id)) {
    throw new Error(`Invalid tweet id: ${id}`);
  }

  const url = new URL(`${SYNDICATION_URL}/tweet-result`);

  url.searchParams.set('id', id);
  url.searchParams.set('lang', 'en');
  url.searchParams.set(
    'features',
    [
      'tfw_timeline_list:',
      'tfw_follower_count_sunset:true',
      'tfw_tweet_edit_backend:on',
      'tfw_refsrc_session:on',
      'tfw_fosnr_soft_interventions_enabled:on',
      'tfw_show_birdwatch_pivots_enabled:on',
      'tfw_show_business_verified_badge:on',
      'tfw_duplicate_scribes_to_settings:on',
      'tfw_use_profile_image_shape_enabled:on',
      'tfw_show_blue_verified_badge:on',
      'tfw_legacy_timeline_sunset:true',
      'tfw_show_gov_verified_badge:on',
      'tfw_show_business_affiliate_badge:on',
      'tfw_tweet_edit_frontend:on',
    ].join(';'),
  );

  url.searchParams.set('token', getToken(id));

  const res = await fetch(url.toString(), fetchOptions);
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const json = isJson ? await res.json() : null;

  if (res.ok) {
    if (json?.__typename === 'TweetTombstone') {
      return { tombstone: true };
    }

    return { data: json };
  }

  if (res.status === 404) {
    return { notFound: true };
  }

  throw new TwitterApiError({
    message:
      typeof json?.error === 'string'
        ? json.error
        : `Failed to fetch tweet at "${url}" with "${res.status}".`,
    status: res.status,
    data: json,
  });
}

// Extract tweet ID from URL
function extractTweetId(input) {
  if (TWEET_ID.test(input)) {
    return input;
  }

  const urlMatch = input.match(/status\/(\d+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  throw new Error(`Could not extract tweet ID from: ${input}`);
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const input = process.argv[2];

  if (!input) {
    console.error('Usage: node fetchTweet.js <tweet-url-or-id>');
    process.exit(1);
  }

  try {
    const id = extractTweetId(input);
    const result = await fetchTweet(id);

    if (result.tombstone) {
      console.error('Tweet is unavailable (tombstone)');
      process.exit(1);
    }

    if (result.notFound) {
      console.error('Tweet not found');
      process.exit(1);
    }

    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

export { fetchTweet, extractTweetId, TwitterApiError };
