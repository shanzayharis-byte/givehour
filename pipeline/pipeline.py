import sys
import logging
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s — %(levelname)s — %(message)s'
)


def run():
    logging.info("Give Hour pipeline starting — " + datetime.now().strftime("%Y-%m-%d %H:%M"))

    try:
        logging.info("Step 1: Cleaning listings...")
        from clean_listings import run as clean
        clean()
        logging.info("Step 1 complete.")

        logging.info("Step 2: Scoring matches...")
        from score_matching import run as score
        score()
        logging.info("Step 2 complete.")

        logging.info("Step 3: Aggregating hours...")
        from aggregate_hours import run as aggregate
        aggregate()
        logging.info("Step 3 complete.")

        logging.info("Step 4: Building personalized feeds...")
        from build_feed import run as feed
        feed()
        logging.info("Step 4 complete.")

        logging.info("Pipeline complete. All 4 tables updated in Supabase.")

    except Exception as e:
        import traceback
        logging.error("Pipeline failed at: " + str(e))
        logging.error(traceback.format_exc())
        sys.exit(1)


if __name__ == "__main__":
    run()
