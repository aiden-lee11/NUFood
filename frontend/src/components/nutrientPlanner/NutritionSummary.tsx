import { Box, Grid, Stack, Typography } from '@mui/material';
import React from 'react';
import { useDataStore } from '../../store';
import { calculateGoalPercentage } from '../../util/nutrientPlannerUtils';
import NutritionGoalsSettings from './NutritionGoalsSettings';

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
    const { nutritionGoals } = useDataStore();

    // Calculate nutrition percentage based on user goals
    const caloriesPercentage = calculateGoalPercentage(totalCalories, nutritionGoals, 'calories');
    const proteinPercentage = calculateGoalPercentage(totalProtein, nutritionGoals, 'protein');
    const carbsPercentage = calculateGoalPercentage(totalCarbs, nutritionGoals, 'carbs');
    const fatPercentage = calculateGoalPercentage(totalFat, nutritionGoals, 'fat');

    return (
        <Box sx={{
            p: { xs: 1, sm: 2 },
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper'
        }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6" sx={{ fontWeight: 'medium', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                    Nutrition Summary
                </Typography>
                <NutritionGoalsSettings />
            </Stack>

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
                            CALORIES ({caloriesPercentage}%)
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            Goal: {nutritionGoals.calories}
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
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            Goal: {nutritionGoals.protein}g
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
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            Goal: {nutritionGoals.carbs}g
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
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            Goal: {nutritionGoals.fat}g
                        </Typography>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
};

export default NutritionSummary; 
