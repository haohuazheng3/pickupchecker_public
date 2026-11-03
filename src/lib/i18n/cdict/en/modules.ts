/** English client strings: modules (MiniMap, and the other-trackers footnote that server and client modules share). */
export const modules = {
  /** MiniMap on a store page: {label} is the store's name ("Apple Fifth Avenue"). */
  minimap: {
    aria: "Open {label} on the live map",
    cta: "Open on the live map →",
  },
  /**
   * Restocks other trackers published (dashed / hollow marks in the charts). {sources} their names, {range} the dates
   * ("Oct 26 – Nov 1"), {mark} how the chart draws them, {what} "iPhone Duo restocks", {links} the trackers' names
   * linked to their sites.
   */
  reports: {
    legend: "Reported by other trackers ({sources}), {range}",
    note: "{mark}: {what} published by {links} for {range}. They are those sites' observations, not restocks PickupChecker confirmed, and none of our numbers count them.",
    /** {models} "iPhone Duo" or "iPhone Duo and iPhone 18 Pro". */
    what: "{models} restocks",
    whatAny: "restocks",
    /** How each chart draws them (the footnote starts with it). */
    markDashed: "Dashed",
    markDashedRings: "Dashed rings",
    markHollowDots: "Hollow dots",
  },
};
