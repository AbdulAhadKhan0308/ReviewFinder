import { useApiQuery } from '../../api/useApiQuery'
import { reviewsBreakdownPath } from '../../api/reviews'
import { Button, Stack, Typography } from '@mui/material';

interface IBreakdown {
    breakdown: {
        '5'?: number,
        '4'?: number,
        '3'?: number,
        '2'?: number,
        '1'?: number,
    }
};

export function ReviewBreakdown({ restaurantId }: { restaurantId: string }) {
   const query  = useApiQuery(reviewsBreakdownPath(restaurantId));
   function onReloadClick(){
    query.reload();
   }

   if(query.status=='loading') return <Typography variant="body2">Loading review breakdown...</Typography>
   if(query.status=='error') return <Stack><Typography variant="body2">Error loading review breakdown</Typography><Button onClick={onReloadClick}>Reload</Button></Stack>

   const data  = query.data as IBreakdown;
   console.log("@@@ breakdown", data)

   return (
    <Stack direction="row" spacing={1}>
      <Typography variant="body2">
        {`5 star reviews: ${data.breakdown['5'] ?? 0}`}
        <br/>
        {`4 star reviews: ${data.breakdown['4'] ?? 0}`}
        <br/>
        {`3 star reviews: ${data.breakdown['3'] ?? 0}`}
        <br/>
        {`2 star reviews: ${data.breakdown['2'] ?? 0}`}
        <br/>
        {`1 star reviews: ${data.breakdown['1'] ?? 0}`}
        <br/>
      </Typography>
      <Button onClick={onReloadClick}>Reload</Button>
    </Stack>
   )
}