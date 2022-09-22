/**
 * On create we need to know:
 * - is this a hydration
 * - is this a new create
 *
 * If it is a hydration the caller should tell us.
 * If it is a hydration we need to:
 * 1. Check cache. If the thing is already in the cache, return that thing.
 *  Should we update the cached thing if there is a delta?
 * 2. If the thing is not in the cache, return new item with mem vers set to min vers
 *
 * If not hydration, just create the thing as usual. Setting mem vers to next vers
 *
 * Our unique key for the cache for a value is:
 * db + collection + id
 */
