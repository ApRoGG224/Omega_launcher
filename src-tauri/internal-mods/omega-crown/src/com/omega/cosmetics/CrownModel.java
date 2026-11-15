package com.omega.cosmetics;

public class CrownModel {
    public static final float RIM_WIDTH = 9.4f;
    public static final float RIM_HEIGHT = 1.2f;
    public static final float RIM_THICKNESS = 0.4f;
    public static final float BASE_Y = 7.6f;

    public static final int GOLD_COLOR = 0xF5B81B;
    public static final int RUBY_COLOR = 0xDF1638;

    public static final float[][] CORNER_PEAKS = {
        {-4.5f, 8.6f, -4.5f},
        { 4.5f, 8.6f, -4.5f},
        {-4.5f, 8.6f,  4.5f},
        { 4.5f, 8.6f,  4.5f}
    };

    public static final float[][] RUBY_POSITIONS = {
        { 0.0f, 8.6f,  4.6f},
        { 0.0f, 8.6f, -4.6f},
        {-4.6f, 8.6f,  0.0f},
        { 4.6f, 8.6f,  0.0f}
    };
}
