import sys
import logging
from datetime import datetime

import supabase_client as db

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s — %(levelname)s — %(message)s'
)


def run():
    logging.info("Give Hour pipeline starting — " + datetime.now().strftime("%Y-%m-%d %H:%M"))

    try:
        # Clear all output tables in reverse dependency order
        logging.info("Pre-step: clearing pipeline tables...")
        db.delete_all("personalized_feed")
        db.delete_all("match_scores")
        db.delete_all("impact_stats")
        db.delete_all("clean_listings")
        logging.info("Pre-step complete.")

        logging.info("Step 1: Fetching VolunteerConnector listings...")
        from ingest_volunteerconnector import run as ingest_vc
        ingest_vc()
        logging.info("Step 1 complete.")

        logging.info("Step 2: Fetching org listings...")
        from ingest_org import run as ingest_org
        ingest_org()
        logging.info("Step 2 complete.")

        logging.info("Step 3: Fetching Idealist listings...")
        from ingest_idealist import run as ingest_idealist
        ingest_idealist()
        logging.info("Step 3 complete.")

        logging.info("Step 4: Scoring matches...")
        from score_matching import run as score
        score()
        logging.info("Step 4 complete.")

        logging.info("Step 5: Aggregating hours...")
        from aggregate_hours import run as aggregate
        aggregate()
        logging.info("Step 5 complete.")

        logging.info("Step 6: Building personalized feeds...")
        from build_feed import run as feed
        feed()
        logging.info("Step 6 complete.")

        logging.info("Pipeline complete. All tables updated in Supabase.")

    except Exception as e:
        import traceback
        logging.error("Pipeline failed at: " + str(e))
        logging.error(traceback.format_exc())
        sys.exit(1)


if __name__ == "__main__":
    run()
