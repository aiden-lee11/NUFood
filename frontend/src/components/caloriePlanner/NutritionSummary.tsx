import { Box, Grid, Typography } from '@mui/material';
import React from 'react';
import { calculatePercentage } from '../../util/caloriePlannerUtils';

interface NutritionSummaryProps {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
}

const NutritionSummary: React.FC<NutritionSummaryProps> = ({
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat
}) => {
    // Calculate nutrition percentage based on general daily values
    const proteinPercentage = calculatePercentage(totalProtein, 50); // Using 50g as reference
    const carbsPercentage = calculatePercentage(totalCarbs, 275); // Using 275g as reference
    const fatPercentage = calculatePercentage(totalFat, 78); // Using 78g as reference

    return (
        <Box sx={{
            p: { xs: 1, sm: 2 },
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper'
        }}>
            <Grid container spacing={1}>
                <Grid item xs={6} sm={3}>
                    <Box sx={{
                        p: 1,
                        textAlign: 'center',
                        borderRadius: 1,
                        bgcolor: 'background.default',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                            {totalCalories.toFixed(0)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            CALORIES
                        </Typography>
                    </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Box sx={{
                        p: 1,
                        textAlign: 'center',
                        borderRadius: 1,
                        bgcolor: 'background.default',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <Typography variant="body1" color="success.main" sx={{ fontWeight: 'bold' }}>
                            {totalProtein.toFixed(1)}g
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            PROTEIN ({proteinPercentage}%)
                        </Typography>
                    </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Box sx={{
                        p: 1,
                        textAlign: 'center',
                        borderRadius: 1,
                        bgcolor: 'background.default',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <Typography variant="body1" color="info.main" sx={{ fontWeight: 'bold' }}>
                            {totalCarbs.toFixed(1)}g
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            CARBS ({carbsPercentage}%)
                        </Typography>
                    </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Box sx={{
                        p: 1,
                        textAlign: 'center',
                        borderRadius: 1,
                        bgcolor: 'background.default',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <Typography variant="body1" color="warning.main" sx={{ fontWeight: 'bold' }}>
                            {totalFat.toFixed(1)}g
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            FAT ({fatPercentage}%)
                        </Typography>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
};

export default NutritionSummary; 