-- Add not_helpful_count column to product_reviews table
-- This migration adds the missing column for tracking not helpful votes

-- Add the column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'product_reviews' 
        AND column_name = 'not_helpful_count'
    ) THEN
        ALTER TABLE public.product_reviews 
        ADD COLUMN not_helpful_count INTEGER DEFAULT 0;
        
        RAISE NOTICE 'Added not_helpful_count column to product_reviews table';
    ELSE
        RAISE NOTICE 'Column not_helpful_count already exists in product_reviews table';
    END IF;
END $$;

-- Update existing reviews to have correct not_helpful_count based on review_helpfulness votes
UPDATE public.product_reviews 
SET not_helpful_count = (
    SELECT COUNT(*) 
    FROM public.review_helpfulness 
    WHERE review_helpfulness.review_id = product_reviews.id 
    AND review_helpfulness.is_helpful = false
);

-- Update existing reviews to have correct helpful_count based on review_helpfulness votes
UPDATE public.product_reviews 
SET helpful_count = (
    SELECT COUNT(*) 
    FROM public.review_helpfulness 
    WHERE review_helpfulness.review_id = product_reviews.id 
    AND review_helpfulness.is_helpful = true
);

-- Create or replace function to update vote counts when helpfulness votes change
CREATE OR REPLACE FUNCTION update_review_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update helpful_count and not_helpful_count for the affected review
    UPDATE public.product_reviews 
    SET 
        helpful_count = (
            SELECT COUNT(*) 
            FROM public.review_helpfulness 
            WHERE review_id = COALESCE(NEW.review_id, OLD.review_id) 
            AND is_helpful = true
        ),
        not_helpful_count = (
            SELECT COUNT(*) 
            FROM public.review_helpfulness 
            WHERE review_id = COALESCE(NEW.review_id, OLD.review_id) 
            AND is_helpful = false
        )
    WHERE id = COALESCE(NEW.review_id, OLD.review_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update vote counts
DROP TRIGGER IF EXISTS trigger_update_review_vote_counts_insert ON public.review_helpfulness;
DROP TRIGGER IF EXISTS trigger_update_review_vote_counts_update ON public.review_helpfulness;
DROP TRIGGER IF EXISTS trigger_update_review_vote_counts_delete ON public.review_helpfulness;

CREATE TRIGGER trigger_update_review_vote_counts_insert
    AFTER INSERT ON public.review_helpfulness
    FOR EACH ROW
    EXECUTE FUNCTION update_review_vote_counts();

CREATE TRIGGER trigger_update_review_vote_counts_update
    AFTER UPDATE ON public.review_helpfulness
    FOR EACH ROW
    EXECUTE FUNCTION update_review_vote_counts();

CREATE TRIGGER trigger_update_review_vote_counts_delete
    AFTER DELETE ON public.review_helpfulness
    FOR EACH ROW
    EXECUTE FUNCTION update_review_vote_counts();

-- Verify the changes
SELECT 
    id, 
    helpful_count, 
    not_helpful_count,
    (SELECT COUNT(*) FROM review_helpfulness WHERE review_id = product_reviews.id AND is_helpful = true) as actual_helpful,
    (SELECT COUNT(*) FROM review_helpfulness WHERE review_id = product_reviews.id AND is_helpful = false) as actual_not_helpful
FROM public.product_reviews 
LIMIT 5;
