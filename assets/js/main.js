
const myHomography = new homography.Homography();





function shapeTrajectory(stripe,points, space,n) {



    const w = stripe.width

    // Define the reference points. In this case using normalized coordinates (from 0.0 to 1.0).
    const srcPoints = [[0, 0], [0, 1], [1, 0], [1, 1]];
    const dstPoints = [[1/5, 1/5], [0, 1/2], [1, 0], [6/8, 6/8]];


    const myHomography = new Homography("piecewiseaffine");
    // Set the reference points
    myHomography.setReferencePoints(srcPoints, dstPoints);
    // Warp your image
}